import { Logger } from '@aws-lambda-powertools/logger';
import {
    PublishBatchCommand,
    PublishBatchRequestEntry,
    PublishCommand,
    SNSClient,
} from '@aws-sdk/client-sns';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
