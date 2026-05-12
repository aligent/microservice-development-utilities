import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    BatchWriteCommand,
    DynamoDBDocumentClient,
    QueryCommand,
    ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DynamoDBService } from './dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);
const TableName = 'my-table';

const buildService = () =>
    new DynamoDBService({ client: DynamoDBDocumentClient.from(new DynamoDBClient({})) });

describe('DynamoDBService', () => {
    afterEach(() => {
        ddbMock.reset();
    });

    describe('batchWrite', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('returns immediately when there are no UnprocessedItems', async () => {
            ddbMock.on(BatchWriteCommand).resolves({});
            const service = buildService();

            const result = await service.batchWrite({
                RequestItems: { [TableName]: [{ PutRequest: { Item: { pk: 'a' } } }] },
            });

            expect(result.UnprocessedItems).toBeUndefined();
            expect(ddbMock.commandCalls(BatchWriteCommand)).toHaveLength(1);
        });

        it('retries UnprocessedItems and succeeds when they clear', async () => {
            ddbMock
                .on(BatchWriteCommand)
                .resolvesOnce({
                    UnprocessedItems: {
                        [TableName]: [{ PutRequest: { Item: { pk: 'b' } } }],
                    },
                })
                .resolves({});
            const service = buildService();

            const promise = service.batchWrite({
                RequestItems: { [TableName]: [{ PutRequest: { Item: { pk: 'b' } } }] },
            });

            await vi.runAllTimersAsync();
            await expect(promise).resolves.toBeDefined();

            const calls = ddbMock.commandCalls(BatchWriteCommand);
            expect(calls).toHaveLength(2);
            const retryItems = calls[1]?.args[0].input.RequestItems?.[TableName];
            expect(retryItems).toEqual([{ PutRequest: { Item: { pk: 'b' } } }]);
        });

        it('throws after MAX_ATTEMPTS when UnprocessedItems never clear', async () => {
            ddbMock.on(BatchWriteCommand).resolves({
                UnprocessedItems: {
                    [TableName]: [{ PutRequest: { Item: { pk: 'c' } } }],
                },
            });
            const service = buildService();

            const promise = service.batchWrite({
                RequestItems: { [TableName]: [{ PutRequest: { Item: { pk: 'c' } } }] },
            });

            const expectation = expect(promise).rejects.toThrow(
                'batchWrite failed after 5 attempts'
            );
            await vi.runAllTimersAsync();
            await expectation;

            expect(ddbMock.commandCalls(BatchWriteCommand)).toHaveLength(5);
        });
    });

    describe('paginateItems', () => {
        it('yields each item across pages', async () => {
            ddbMock
                .on(QueryCommand)
                .resolvesOnce({
                    Items: [{ pk: '1' }, { pk: '2' }],
                    LastEvaluatedKey: { pk: '2' },
                })
                .resolves({ Items: [{ pk: '3' }] });
            const service = buildService();

            const items: Array<{ pk: string }> = [];
            for await (const item of service.paginateItems<{ pk: string }>({
                TableName,
                KeyConditionExpression: 'pk = :pk',
                ExpressionAttributeValues: { ':pk': 'x' },
            })) {
                items.push(item);
            }

            expect(items.map(i => i.pk)).toEqual(['1', '2', '3']);
        });
    });

    describe('paginateScan', () => {
        it('yields each item across pages', async () => {
            ddbMock
                .on(ScanCommand)
                .resolvesOnce({
                    Items: [{ pk: 'a' }],
                    LastEvaluatedKey: { pk: 'a' },
                })
                .resolves({ Items: [{ pk: 'b' }, { pk: 'c' }] });
            const service = buildService();

            const items: Array<{ pk: string }> = [];
            for await (const item of service.paginateScan<{ pk: string }>({ TableName })) {
                items.push(item);
            }

            expect(items.map(i => i.pk)).toEqual(['a', 'b', 'c']);
        });
    });
});
