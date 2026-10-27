import { Logger } from '@aws-lambda-powertools/logger';
import {
    DeleteMessageBatchCommand,
    DeleteMessageBatchRequestEntry,
    DeleteMessageCommand,
    ReceiveMessageCommand,
    SendMessageBatchCommand,
    SendMessageBatchRequestEntry,
    SendMessageCommand,
    SQSClient,
} from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BatchOperationError } from '../util/batch-operation-error.js';
import { SQSService } from './sqs';

const sqsMock = mockClient(SQSClient);
const QueueUrl = 'https://sqs.us-east-1.amazonaws.com/0/queue';

type BatchEntry = { Id?: string };
type BatchInput = { Entries?: BatchEntry[] };
type BatchResult = { Successful?: BatchEntry[]; Failed?: BatchEntry[] };

/**
 * Answers every batch request the way SQS does: entries whose Id is in
 * `failingIds` come back under `Failed`, the rest under `Successful`.
 */
function rejectEntries(failingIds: string[]) {
    sqsMock.onAnyCommand().callsFake((input: BatchInput) => {
        const entryIds = (input.Entries ?? []).map(entry => entry.Id ?? '');
        return {
            Successful: entryIds.filter(id => !failingIds.includes(id)).map(Id => ({ Id })),
            // Payload fields SQS does not echo today. They are here so the redaction
            // tests fail if the wrapper ever copies a whole failed entry.
            Failed: entryIds
                .filter(id => failingIds.includes(id))
                .map(Id => ({
                    Id,
                    SenderFault: false,
                    Code: 'InternalError',
                    Message: `${Id} failed`,
                    MessageBody: `secret-body-${Id}`,
                    ReceiptHandle: `secret-handle-${Id}`,
                })),
        };
    });
}

const ids = (count: number): string[] => Array.from({ length: count }, (_, i) => `${i}`);

const batchMethods = [
    {
        method: 'sendMessageBatch',
        payloadField: 'MessageBody',
        send: (service: SQSService, entryIds: string[]) =>
            service.sendMessageBatch({
                QueueUrl,
                Entries: entryIds.map(Id => ({ Id, MessageBody: `secret-body-${Id}` })),
            }),
    },
    {
        method: 'deleteMessageBatch',
        payloadField: 'ReceiptHandle',
        send: (service: SQSService, entryIds: string[]) =>
            service.deleteMessageBatch({
                QueueUrl,
                Entries: entryIds.map(Id => ({ Id, ReceiptHandle: `secret-handle-${Id}` })),
            }),
    },
];

describe('SQSService', () => {
    afterEach(() => {
        sqsMock.reset();
    });

    it('constructs with default logger and client when no options supplied', () => {
        expect(() => new SQSService()).not.toThrow();
    });

    describe('receiveMessages', () => {
        it('returns the Messages array', async () => {
            sqsMock
                .on(ReceiveMessageCommand)
                .resolves({ Messages: [{ MessageId: '1', Body: 'a' }] });
            const service = new SQSService({ client: new SQSClient({}) });

            const messages = await service.receiveMessages({ QueueUrl });

            expect(messages).toEqual([{ MessageId: '1', Body: 'a' }]);
        });

        it('returns an empty array when no Messages are present', async () => {
            sqsMock.on(ReceiveMessageCommand).resolves({});
            const service = new SQSService({ client: new SQSClient({}) });

            const messages = await service.receiveMessages({ QueueUrl });

            expect(messages).toEqual([]);
        });
    });

    describe('sendMessageBatch', () => {
        it('returns an empty array when Entries is undefined', async () => {
            const service = new SQSService({ client: new SQSClient({}) });

            const result = await service.sendMessageBatch({
                QueueUrl,
            } as Parameters<SQSService['sendMessageBatch']>[0]);

            expect(result).toEqual([]);
            expect(sqsMock.commandCalls(SendMessageBatchCommand)).toHaveLength(0);
        });

        it('chunks Entries into 10-entry requests', async () => {
            sqsMock.on(SendMessageBatchCommand).resolves({ Successful: [], Failed: [] });
            const entries: SendMessageBatchRequestEntry[] = Array.from({ length: 23 }, (_, i) => ({
                Id: `${i}`,
                MessageBody: `body-${i}`,
            }));
            const service = new SQSService({ client: new SQSClient({}) });

            await service.sendMessageBatch({ QueueUrl, Entries: entries });

            const calls = sqsMock.commandCalls(SendMessageBatchCommand);
            expect(calls.map(c => c.args[0].input.Entries?.length)).toEqual([10, 10, 3]);
        });

        it('logs only QueueUrl and entryCount at INFO level', async () => {
            sqsMock.on(SendMessageBatchCommand).resolves({ Successful: [], Failed: [] });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SQSService({ client: new SQSClient({}), logger });

            await service.sendMessageBatch({
                QueueUrl,
                Entries: [{ Id: '1', MessageBody: 'shh' }],
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).not.toHaveProperty('Entries');
            expect(loggedInput).toMatchObject({ entryCount: 1 });
        });
    });

    describe('pass-through commands', () => {
        it('sendMessage sends a SendMessageCommand', async () => {
            sqsMock.on(SendMessageCommand).resolves({ MessageId: 'mid' });
            const service = new SQSService({ client: new SQSClient({}) });

            await service.sendMessage({ QueueUrl, MessageBody: 'hi' });

            expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(1);
        });

        it('leaves a MessageBody at exactly the limit untruncated and unwarned', async () => {
            sqsMock.on(SendMessageCommand).resolves({ MessageId: 'mid' });
            const logger = new Logger();
            const warnSpy = vi.spyOn(logger, 'warn');
            const service = new SQSService({
                client: new SQSClient({}),
                logger,
                truncate: true,
            });
            const input = { QueueUrl, MessageBody: 'x'.repeat(262_144) };

            await service.sendMessage(input);

            const sent = sqsMock.commandCalls(SendMessageCommand)[0]?.args[0].input;
            expect(sent).toStrictEqual(input);
            expect(warnSpy).not.toHaveBeenCalled();
        });

        it('truncates oversized MessageBody when the instance opts in to truncation', async () => {
            sqsMock.on(SendMessageCommand).resolves({ MessageId: 'mid' });
            const service = new SQSService({ client: new SQSClient({}), truncate: true });

            const oversized = 'x'.repeat(300_000);
            await service.sendMessage({ QueueUrl, MessageBody: oversized });

            const sent =
                sqsMock.commandCalls(SendMessageCommand)[0]?.args[0].input.MessageBody ?? '';
            expect(Buffer.byteLength(sent, 'utf8')).toBeLessThanOrEqual(262_144);
            expect(sent.length).toBeLessThan(oversized.length);
        });

        it('passes oversized MessageBody through unchanged when truncation is off', async () => {
            sqsMock.on(SendMessageCommand).resolves({ MessageId: 'mid' });
            const service = new SQSService({ client: new SQSClient({}) });

            const oversized = 'x'.repeat(300_000);
            await service.sendMessage({ QueueUrl, MessageBody: oversized });

            const sent =
                sqsMock.commandCalls(SendMessageCommand)[0]?.args[0].input.MessageBody ?? '';
            expect(sent.length).toBe(oversized.length);
        });

        it('per-call truncate: true overrides an instance default of false', async () => {
            sqsMock.on(SendMessageCommand).resolves({ MessageId: 'mid' });
            const service = new SQSService({ client: new SQSClient({}) });

            const oversized = 'x'.repeat(300_000);
            await service.sendMessage({ QueueUrl, MessageBody: oversized }, { truncate: true });

            const sent =
                sqsMock.commandCalls(SendMessageCommand)[0]?.args[0].input.MessageBody ?? '';
            expect(sent.length).toBeLessThan(oversized.length);
        });

        it('warn-logs the truncated field on oversize', async () => {
            sqsMock.on(SendMessageCommand).resolves({ MessageId: 'mid' });
            const logger = new Logger();
            logger.setLogLevel('WARN');
            const warnSpy = vi.spyOn(logger, 'warn');
            const service = new SQSService({
                client: new SQSClient({}),
                logger,
                truncate: true,
            });

            await service.sendMessage({ QueueUrl, MessageBody: 'x'.repeat(300_000) });

            expect(warnSpy).toHaveBeenCalledWith(
                'Truncated SQS sendMessage input',
                expect.objectContaining({ fields: ['MessageBody'] })
            );
        });

        it('sendMessage omits MessageBody and MessageAttributes from the INFO log', async () => {
            sqsMock.on(SendMessageCommand).resolves({ MessageId: 'mid' });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SQSService({ client: new SQSClient({}), logger });

            await service.sendMessage({
                QueueUrl,
                MessageBody: 'shh',
                MessageAttributes: {
                    user: { DataType: 'String', StringValue: 'alice' },
                },
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).not.toHaveProperty('MessageBody');
            expect(loggedInput).not.toHaveProperty('MessageAttributes');
        });

        it('deleteMessage sends a DeleteMessageCommand', async () => {
            sqsMock.on(DeleteMessageCommand).resolves({});
            const service = new SQSService({ client: new SQSClient({}) });

            await service.deleteMessage({ QueueUrl, ReceiptHandle: 'h' });

            expect(sqsMock.commandCalls(DeleteMessageCommand)).toHaveLength(1);
        });
    });

    describe('deleteMessageBatch', () => {
        it('returns an empty array when Entries is undefined', async () => {
            const service = new SQSService({ client: new SQSClient({}) });

            const result = await service.deleteMessageBatch({
                QueueUrl,
            } as Parameters<SQSService['deleteMessageBatch']>[0]);

            expect(result).toEqual([]);
            expect(sqsMock.commandCalls(DeleteMessageBatchCommand)).toHaveLength(0);
        });

        it('chunks Entries into 10-entry requests', async () => {
            sqsMock.on(DeleteMessageBatchCommand).resolves({ Successful: [], Failed: [] });
            const entries: DeleteMessageBatchRequestEntry[] = Array.from(
                { length: 15 },
                (_, i) => ({ Id: `${i}`, ReceiptHandle: `handle-${i}` })
            );
            const service = new SQSService({ client: new SQSClient({}) });

            await service.deleteMessageBatch({ QueueUrl, Entries: entries });

            const calls = sqsMock.commandCalls(DeleteMessageBatchCommand);
            expect(calls.map(c => c.args[0].input.Entries?.length)).toEqual([10, 5]);
        });

        it('logs only QueueUrl and entryCount at INFO level', async () => {
            sqsMock.on(DeleteMessageBatchCommand).resolves({ Successful: [], Failed: [] });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SQSService({ client: new SQSClient({}), logger });

            await service.deleteMessageBatch({
                QueueUrl,
                Entries: [{ Id: '1', ReceiptHandle: 'handle' }],
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).not.toHaveProperty('Entries');
            expect(loggedInput).toMatchObject({ entryCount: 1 });
        });
    });

    describe.each(batchMethods)('$method partial failure', ({ send, payloadField }) => {
        const service = () => new SQSService({ client: new SQSClient({}) });

        async function batchFailure(
            promise: Promise<unknown>
        ): Promise<BatchOperationError<BatchResult>> {
            const error = await promise.then(
                () => undefined,
                (thrown: unknown) => thrown
            );
            if (!(error instanceof BatchOperationError)) {
                throw new Error(`Expected a BatchOperationError, got: ${String(error)}`);
            }
            return error;
        }

        it('throws with the failed entry when one entry in a single chunk is rejected', async () => {
            rejectEntries(['1']);

            const error = await batchFailure(send(service(), ids(3)));

            expect(error.failed).toEqual([{ id: '1', code: 'InternalError', message: '1 failed' }]);
            expect(error.results).toHaveLength(1);
            expect(error.results[0]).toMatchObject({ Successful: [{ Id: '0' }, { Id: '2' }] });
        });

        it('sends every chunk before throwing when failures land in different chunks', async () => {
            rejectEntries(['2', '21']);

            const error = await batchFailure(send(service(), ids(23)));

            expect(sqsMock.calls()).toHaveLength(3);
            expect(error.failed.map(entry => entry.id)).toEqual(['2', '21']);
            expect(error.results).toHaveLength(3);
            expect(error.results[1]).toMatchObject({ Failed: [] });
            expect(error.results.map(result => result.Successful?.length)).toEqual([9, 10, 2]);
        });

        it('throws with every entry listed when all entries are rejected', async () => {
            rejectEntries(ids(12));

            const error = await batchFailure(send(service(), ids(12)));

            expect(sqsMock.calls()).toHaveLength(2);
            expect(error.failed.map(entry => entry.id)).toEqual(ids(12));
            expect(error.results.map(result => result.Successful)).toEqual([[], []]);
        });

        it('returns the per-chunk outputs unchanged when no entry fails', async () => {
            rejectEntries([]);

            const results = await send(service(), ids(12));

            expect(results).toEqual([
                {
                    Successful: ids(12)
                        .slice(0, 10)
                        .map(Id => ({ Id })),
                    Failed: [],
                },
                {
                    Successful: ids(12)
                        .slice(10)
                        .map(Id => ({ Id })),
                    Failed: [],
                },
            ]);
        });

        it('lets request-level SDK exceptions propagate unchanged', async () => {
            sqsMock.onAnyCommand().rejects(new Error('Rate exceeded'));

            const outcome = send(service(), ids(3));

            await expect(outcome).rejects.toThrow('Rate exceeded');
            await expect(outcome).rejects.not.toBeInstanceOf(BatchOperationError);
        });

        it('exposes neither payload on the failed entries nor in the warning at INFO level', async () => {
            rejectEntries(['1']);
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const warnSpy = vi.spyOn(logger, 'warn');
            const failingService = new SQSService({ client: new SQSClient({}), logger });

            const error = await batchFailure(send(failingService, ids(3)));

            expect(error.failed[0]).not.toHaveProperty(payloadField);
            expect(JSON.stringify(error.failed)).not.toContain('secret');
            expect(warnSpy).toHaveBeenCalledTimes(1);
            const [, payload] = warnSpy.mock.calls[0] ?? [];
            expect(payload).toEqual({ failedCount: 1, codes: ['InternalError'] });
        });
    });
});
