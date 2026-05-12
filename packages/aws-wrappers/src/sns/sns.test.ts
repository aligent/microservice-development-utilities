import { PublishBatchCommand, PublishBatchRequestEntry, SNSClient } from '@aws-sdk/client-sns';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it } from 'vitest';
import { SNSService } from './sns';

const snsMock = mockClient(SNSClient);

describe('SNSService', () => {
    afterEach(() => {
        snsMock.reset();
    });

    describe('publishBatch', () => {
        it('chunks PublishBatchRequestEntries into 10-entry requests', async () => {
            snsMock.on(PublishBatchCommand).resolves({ Successful: [], Failed: [] });

            const entries: PublishBatchRequestEntry[] = Array.from({ length: 25 }, (_, i) => ({
                Id: `msg-${i}`,
                Message: `body-${i}`,
            }));

            const service = new SNSService({ client: snsMock as unknown as SNSClient });
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
            const service = new SNSService({ client: snsMock as unknown as SNSClient });

            await service.publishBatch({
                TopicArn: 'arn:aws:sns:us-east-1:0:topic',
                PublishBatchRequestEntries: [{ Id: '1', Message: 'hello' }],
            });

            expect(snsMock.commandCalls(PublishBatchCommand)).toHaveLength(1);
        });

        it('returns an empty array when no entries are supplied', async () => {
            const service = new SNSService({ client: snsMock as unknown as SNSClient });
            const results = await service.publishBatch({
                TopicArn: 'arn:aws:sns:us-east-1:0:topic',
                PublishBatchRequestEntries: [],
            });

            expect(results).toEqual([]);
            expect(snsMock.commandCalls(PublishBatchCommand)).toHaveLength(0);
        });
    });
});
