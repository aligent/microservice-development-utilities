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
import { SQSService } from './sqs';

const sqsMock = mockClient(SQSClient);
const QueueUrl = 'https://sqs.us-east-1.amazonaws.com/0/queue';

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
    });

    describe('pass-through commands', () => {
        it('sendMessage sends a SendMessageCommand', async () => {
            sqsMock.on(SendMessageCommand).resolves({ MessageId: 'mid' });
            const service = new SQSService({ client: new SQSClient({}) });

            await service.sendMessage({ QueueUrl, MessageBody: 'hi' });

            expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(1);
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
    });
});
