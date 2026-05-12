import {
    DeleteMessageBatchCommand,
    DeleteMessageBatchRequestEntry,
    ReceiveMessageCommand,
    SendMessageBatchCommand,
    SendMessageBatchRequestEntry,
    SQSClient,
} from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it } from 'vitest';
import { SQSService } from './sqs';

const sqsMock = mockClient(SQSClient);
const QueueUrl = 'https://sqs.us-east-1.amazonaws.com/0/queue';

describe('SQSService', () => {
    afterEach(() => {
        sqsMock.reset();
    });

    describe('receiveMessages', () => {
        it('returns the Messages array', async () => {
            sqsMock
                .on(ReceiveMessageCommand)
                .resolves({ Messages: [{ MessageId: '1', Body: 'a' }] });
            const service = new SQSService({ client: sqsMock as unknown as SQSClient });

            const messages = await service.receiveMessages({ QueueUrl });

            expect(messages).toEqual([{ MessageId: '1', Body: 'a' }]);
        });

        it('returns an empty array when no Messages are present', async () => {
            sqsMock.on(ReceiveMessageCommand).resolves({});
            const service = new SQSService({ client: sqsMock as unknown as SQSClient });

            const messages = await service.receiveMessages({ QueueUrl });

            expect(messages).toEqual([]);
        });
    });

    describe('sendMessageBatch', () => {
        it('chunks Entries into 10-entry requests', async () => {
            sqsMock.on(SendMessageBatchCommand).resolves({ Successful: [], Failed: [] });
            const entries: SendMessageBatchRequestEntry[] = Array.from({ length: 23 }, (_, i) => ({
                Id: `${i}`,
                MessageBody: `body-${i}`,
            }));
            const service = new SQSService({ client: sqsMock as unknown as SQSClient });

            await service.sendMessageBatch({ QueueUrl, Entries: entries });

            const calls = sqsMock.commandCalls(SendMessageBatchCommand);
            expect(calls.map(c => c.args[0].input.Entries?.length)).toEqual([10, 10, 3]);
        });
    });

    describe('deleteMessageBatch', () => {
        it('chunks Entries into 10-entry requests', async () => {
            sqsMock.on(DeleteMessageBatchCommand).resolves({ Successful: [], Failed: [] });
            const entries: DeleteMessageBatchRequestEntry[] = Array.from(
                { length: 15 },
                (_, i) => ({ Id: `${i}`, ReceiptHandle: `handle-${i}` })
            );
            const service = new SQSService({ client: sqsMock as unknown as SQSClient });

            await service.deleteMessageBatch({ QueueUrl, Entries: entries });

            const calls = sqsMock.commandCalls(DeleteMessageBatchCommand);
            expect(calls.map(c => c.args[0].input.Entries?.length)).toEqual([10, 5]);
        });
    });
});
