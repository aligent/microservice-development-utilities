import { Logger } from '@aws-lambda-powertools/logger';
import {
    PublishBatchCommand,
    PublishBatchCommandInput,
    PublishBatchCommandOutput,
    PublishBatchRequestEntry,
    PublishCommand,
    SNSClient,
} from '@aws-sdk/client-sns';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BatchOperationError } from '../util/batch-operation-error.js';
import { SNSService } from './sns';

const snsMock = mockClient(SNSClient);

describe('SNSService', () => {
    afterEach(() => {
        snsMock.reset();
    });

    it('constructs with default logger and client when no options supplied', () => {
        expect(() => new SNSService()).not.toThrow();
    });

    describe('publishBatch', () => {
        it('chunks PublishBatchRequestEntries into 10-entry requests', async () => {
            snsMock.on(PublishBatchCommand).resolves({ Successful: [], Failed: [] });

            const entries: PublishBatchRequestEntry[] = Array.from({ length: 25 }, (_, i) => ({
                Id: `msg-${i}`,
                Message: `body-${i}`,
            }));

            const service = new SNSService({ client: new SNSClient({}) });
            const results = await service.publishBatch({
                TopicArn: 'arn:aws:sns:us-east-1:0:topic',
                PublishBatchRequestEntries: entries,
            });

            const calls = snsMock.commandCalls(PublishBatchCommand);
            expect(calls).toHaveLength(3);
            const sentEntryCounts = calls.map(
                c => c.args[0].input.PublishBatchRequestEntries?.length
            );
            expect(sentEntryCounts).toEqual([10, 10, 5]);
            expect(results).toHaveLength(3);
        });

        it('sends a single request when entries fit within the batch limit', async () => {
            snsMock.on(PublishBatchCommand).resolves({ Successful: [], Failed: [] });
            const service = new SNSService({ client: new SNSClient({}) });

            await service.publishBatch({
                TopicArn: 'arn:aws:sns:us-east-1:0:topic',
                PublishBatchRequestEntries: [{ Id: '1', Message: 'hello' }],
            });

            expect(snsMock.commandCalls(PublishBatchCommand)).toHaveLength(1);
        });

        it('logs only TopicArn and entryCount at INFO level', async () => {
            snsMock.on(PublishBatchCommand).resolves({ Successful: [], Failed: [] });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SNSService({ client: new SNSClient({}), logger });

            await service.publishBatch({
                TopicArn: 'arn:aws:sns:us-east-1:0:topic',
                PublishBatchRequestEntries: [{ Id: '1', Message: 'shh' }],
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).not.toHaveProperty('PublishBatchRequestEntries');
            expect(loggedInput).toMatchObject({ entryCount: 1 });
        });

        it('returns an empty array when entries are empty or undefined', async () => {
            const service = new SNSService({ client: new SNSClient({}) });

            const emptyResult = await service.publishBatch({
                TopicArn: 'arn:aws:sns:us-east-1:0:topic',
                PublishBatchRequestEntries: [],
            });
            const undefinedResult = await service.publishBatch({
                TopicArn: 'arn:aws:sns:us-east-1:0:topic',
            } as Parameters<SNSService['publishBatch']>[0]);

            expect(emptyResult).toEqual([]);
            expect(undefinedResult).toEqual([]);
            expect(snsMock.commandCalls(PublishBatchCommand)).toHaveLength(0);
        });

        describe('partial failure', () => {
            const TopicArn = 'arn:aws:sns:us-east-1:0:topic';
            const service = () => new SNSService({ client: new SNSClient({}) });
            const publish = (svc: SNSService, entryIds: string[]) =>
                svc.publishBatch({
                    TopicArn,
                    PublishBatchRequestEntries: entryIds.map(Id => ({
                        Id,
                        Message: `secret-body-${Id}`,
                        Subject: `secret-subject-${Id}`,
                        MessageAttributes: { secret: { DataType: 'String', StringValue: Id } },
                    })),
                });

            /**
             * Answers every request the way SNS does: entries whose Id is in
             * `failingIds` come back under `Failed`, the rest under `Successful`.
             */
            function rejectEntries(failingIds: string[]) {
                snsMock.on(PublishBatchCommand).callsFake((input: PublishBatchCommandInput) => {
                    const entryIds = (input.PublishBatchRequestEntries ?? []).map(
                        entry => entry.Id ?? ''
                    );
                    return {
                        Successful: entryIds
                            .filter(id => !failingIds.includes(id))
                            .map(Id => ({ Id, MessageId: `mid-${Id}` })),
                        // Payload fields SNS does not echo today. They are here so the
                        // redaction test fails if the wrapper ever copies a whole entry.
                        Failed: entryIds
                            .filter(id => failingIds.includes(id))
                            .map(Id => ({
                                Id,
                                SenderFault: false,
                                Code: 'InternalError',
                                Message: `${Id} failed`,
                                Subject: `secret-subject-${Id}`,
                                MessageAttributes: `secret-attributes-${Id}`,
                            })),
                    };
                });
            }

            async function batchFailure(
                promise: Promise<unknown>
            ): Promise<BatchOperationError<PublishBatchCommandOutput>> {
                const error = await promise.then(
                    () => undefined,
                    (thrown: unknown) => thrown
                );
                if (!(error instanceof BatchOperationError)) {
                    throw new Error(`Expected a BatchOperationError, got: ${String(error)}`);
                }
                return error;
            }

            const ids = (count: number): string[] =>
                Array.from({ length: count }, (_, i) => `${i}`);

            it('throws with the failed entry when one entry in a single chunk is rejected', async () => {
                rejectEntries(['1']);

                const error = await batchFailure(publish(service(), ids(3)));

                expect(error.failed).toEqual([
                    { id: '1', code: 'InternalError', message: '1 failed' },
                ]);
                expect(error.results).toHaveLength(1);
                expect(error.results[0]).toMatchObject({
                    Successful: [{ Id: '0' }, { Id: '2' }],
                });
            });

            it('sends every chunk before throwing when failures land in different chunks', async () => {
                rejectEntries(['2', '21']);

                const error = await batchFailure(publish(service(), ids(23)));

                expect(snsMock.commandCalls(PublishBatchCommand)).toHaveLength(3);
                expect(error.failed.map(entry => entry.id)).toEqual(['2', '21']);
                expect(error.results).toHaveLength(3);
                expect(error.results[1]).toMatchObject({ Failed: [] });
                expect(error.results.map(result => result.Successful?.length)).toEqual([9, 10, 2]);
            });

            it('throws with every entry listed when all entries are rejected', async () => {
                rejectEntries(ids(12));

                const error = await batchFailure(publish(service(), ids(12)));

                expect(snsMock.commandCalls(PublishBatchCommand)).toHaveLength(2);
                expect(error.failed.map(entry => entry.id)).toEqual(ids(12));
                expect(error.results.map(result => result.Successful)).toEqual([[], []]);
            });

            it('returns the per-chunk outputs unchanged when no entry fails', async () => {
                rejectEntries([]);

                const results = await publish(service(), ids(12));

                expect(results).toEqual([
                    {
                        Successful: ids(12)
                            .slice(0, 10)
                            .map(Id => ({ Id, MessageId: `mid-${Id}` })),
                        Failed: [],
                    },
                    {
                        Successful: ids(12)
                            .slice(10)
                            .map(Id => ({ Id, MessageId: `mid-${Id}` })),
                        Failed: [],
                    },
                ]);
            });

            it('lets request-level SDK exceptions propagate unchanged', async () => {
                snsMock.on(PublishBatchCommand).rejects(new Error('Rate exceeded'));

                const outcome = publish(service(), ids(3));

                await expect(outcome).rejects.toThrow('Rate exceeded');
                await expect(outcome).rejects.not.toBeInstanceOf(BatchOperationError);
            });

            it('exposes no payload on the failed entries or in the warning at INFO level', async () => {
                rejectEntries(['1']);
                const logger = new Logger();
                logger.setLogLevel('INFO');
                const warnSpy = vi.spyOn(logger, 'warn');
                const failingService = new SNSService({ client: new SNSClient({}), logger });

                const error = await batchFailure(publish(failingService, ids(3)));

                expect(error.failed[0]).not.toHaveProperty('Subject');
                expect(error.failed[0]).not.toHaveProperty('MessageAttributes');
                expect(JSON.stringify(error.failed)).not.toContain('secret');
                expect(warnSpy).toHaveBeenCalledTimes(1);
                const [, payload] = warnSpy.mock.calls[0] ?? [];
                expect(payload).toEqual({ failedCount: 1, codes: ['InternalError'] });
            });
        });
    });

    describe('publish', () => {
        it('sends a PublishCommand', async () => {
            snsMock.on(PublishCommand).resolves({ MessageId: 'mid' });
            const service = new SNSService({ client: new SNSClient({}) });

            await service.publish({
                TopicArn: 'arn:aws:sns:us-east-1:0:topic',
                Message: 'hi',
            });

            expect(snsMock.commandCalls(PublishCommand)).toHaveLength(1);
        });

        it('passes a within-limit input through unchanged when truncation is enabled', async () => {
            snsMock.on(PublishCommand).resolves({ MessageId: 'mid' });
            const service = new SNSService({ client: new SNSClient({}), truncate: true });
            const input = { TopicArn: 'arn:aws:sns:us-east-1:0:topic', Message: 'hi' };

            await service.publish(input);

            const sent = snsMock.commandCalls(PublishCommand)[0]?.args[0].input;
            expect(sent).toStrictEqual(input);
        });

        it('truncates oversized Message when the instance opts in to truncation', async () => {
            snsMock.on(PublishCommand).resolves({ MessageId: 'mid' });
            const service = new SNSService({ client: new SNSClient({}), truncate: true });

            const oversized = 'x'.repeat(300_000);
            await service.publish({
                TopicArn: 'arn:aws:sns:us-east-1:0:topic',
                Message: oversized,
            });

            const sent = snsMock.commandCalls(PublishCommand)[0]?.args[0].input.Message ?? '';
            expect(Buffer.byteLength(sent, 'utf8')).toBeLessThanOrEqual(262_144);
            expect(sent.length).toBeLessThan(oversized.length);
        });

        it('passes oversized Message through unchanged when truncation is off', async () => {
            snsMock.on(PublishCommand).resolves({ MessageId: 'mid' });
            const service = new SNSService({ client: new SNSClient({}) });

            const oversized = 'x'.repeat(300_000);
            await service.publish({
                TopicArn: 'arn:aws:sns:us-east-1:0:topic',
                Message: oversized,
            });

            const sent = snsMock.commandCalls(PublishCommand)[0]?.args[0].input.Message ?? '';
            expect(sent.length).toBe(oversized.length);
        });

        it('per-call truncate: true overrides an instance default of false', async () => {
            snsMock.on(PublishCommand).resolves({ MessageId: 'mid' });
            const service = new SNSService({ client: new SNSClient({}) });

            const oversized = 'x'.repeat(300_000);
            await service.publish(
                { TopicArn: 'arn:aws:sns:us-east-1:0:topic', Message: oversized },
                { truncate: true }
            );

            const sent = snsMock.commandCalls(PublishCommand)[0]?.args[0].input.Message ?? '';
            expect(sent.length).toBeLessThan(oversized.length);
        });

        it('per-call truncate: false overrides an instance default of true', async () => {
            snsMock.on(PublishCommand).resolves({ MessageId: 'mid' });
            const service = new SNSService({ client: new SNSClient({}), truncate: true });

            const oversized = 'x'.repeat(300_000);
            await service.publish(
                { TopicArn: 'arn:aws:sns:us-east-1:0:topic', Message: oversized },
                { truncate: false }
            );

            const sent = snsMock.commandCalls(PublishCommand)[0]?.args[0].input.Message ?? '';
            expect(sent.length).toBe(oversized.length);
        });

        it('codepoint-truncates oversized Subject and warn-logs the modified fields', async () => {
            snsMock.on(PublishCommand).resolves({ MessageId: 'mid' });
            const logger = new Logger();
            logger.setLogLevel('WARN');
            const warnSpy = vi.spyOn(logger, 'warn');
            const service = new SNSService({
                client: new SNSClient({}),
                logger,
                truncate: true,
            });

            await service.publish({
                TopicArn: 'arn:aws:sns:us-east-1:0:topic',
                Message: 'ok',
                Subject: 'a'.repeat(150),
            });

            const sent = snsMock.commandCalls(PublishCommand)[0]?.args[0].input;
            expect(sent?.Subject?.length).toBe(100);
            expect(warnSpy).toHaveBeenCalledWith(
                'Truncated SNS publish input',
                expect.objectContaining({ fields: expect.arrayContaining(['Subject']) })
            );
        });

        it('omits Message, Subject, MessageAttributes, and PhoneNumber from the INFO log', async () => {
            snsMock.on(PublishCommand).resolves({ MessageId: 'mid' });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SNSService({ client: new SNSClient({}), logger });

            await service.publish({
                TopicArn: 'arn:aws:sns:us-east-1:0:topic',
                Message: 'shh',
                Subject: 'private',
                MessageAttributes: { user: { DataType: 'String', StringValue: 'alice' } },
                PhoneNumber: '+15555555555',
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).not.toHaveProperty('Message');
            expect(loggedInput).not.toHaveProperty('Subject');
            expect(loggedInput).not.toHaveProperty('MessageAttributes');
            expect(loggedInput).not.toHaveProperty('PhoneNumber');
        });
    });
});
