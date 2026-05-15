import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    BatchGetCommand,
    BatchWriteCommand,
    DeleteCommand,
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    ScanCommand,
    UpdateCommand,
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

    it('constructs with default logger and client when no options supplied', () => {
        expect(() => new DynamoDBService()).not.toThrow();
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

    describe('pass-through commands', () => {
        it('getItem returns the unmarshalled Item', async () => {
            ddbMock.on(GetCommand).resolves({ Item: { pk: 'a', value: 1 } });

            await expect(
                buildService().getItem<{ pk: string; value: number }>({
                    TableName,
                    Key: { pk: 'a' },
                })
            ).resolves.toEqual({ pk: 'a', value: 1 });
        });

        it('getItem returns undefined when Item is absent', async () => {
            ddbMock.on(GetCommand).resolves({});
            await expect(
                buildService().getItem({ TableName, Key: { pk: 'x' } })
            ).resolves.toBeUndefined();
        });

        it('putItem sends a PutCommand', async () => {
            ddbMock.on(PutCommand).resolves({});
            await buildService().putItem({ TableName, Item: { pk: 'a' } });
            expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
        });

        it('updateItem returns the typed Attributes', async () => {
            ddbMock.on(UpdateCommand).resolves({ Attributes: { value: 99 } });
            const result = await buildService().updateItem<{ value: number }>({
                TableName,
                Key: { pk: 'a' },
            });
            expect(result.Attributes).toEqual({ value: 99 });
        });

        it('deleteItem returns the typed Attributes', async () => {
            ddbMock.on(DeleteCommand).resolves({ Attributes: { pk: 'a' } });
            const result = await buildService().deleteItem<{ pk: string }>({
                TableName,
                Key: { pk: 'a' },
            });
            expect(result.Attributes).toEqual({ pk: 'a' });
        });

        it('query returns Items typed as T[]', async () => {
            ddbMock.on(QueryCommand).resolves({ Items: [{ pk: 'a' }] });
            const result = await buildService().query<{ pk: string }>({
                TableName,
                KeyConditionExpression: 'pk = :p',
                ExpressionAttributeValues: { ':p': 'a' },
            });
            expect(result.Items).toEqual([{ pk: 'a' }]);
        });

        it('scan returns Items typed as T[]', async () => {
            ddbMock.on(ScanCommand).resolves({ Items: [{ pk: 'a' }] });
            const result = await buildService().scan<{ pk: string }>({ TableName });
            expect(result.Items).toEqual([{ pk: 'a' }]);
        });

        it('batchGet sends a BatchGetCommand', async () => {
            ddbMock.on(BatchGetCommand).resolves({});
            await buildService().batchGet({
                RequestItems: { [TableName]: { Keys: [{ pk: 'a' }] } },
            });
            expect(ddbMock.commandCalls(BatchGetCommand)).toHaveLength(1);
        });

        it('batchGet logs only the table names at INFO level', async () => {
            ddbMock.on(BatchGetCommand).resolves({});
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new DynamoDBService({
                client: DynamoDBDocumentClient.from(new DynamoDBClient({})),
                logger,
            });

            await service.batchGet({
                RequestItems: { [TableName]: { Keys: [{ pk: 'customer-123' }] } },
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).not.toHaveProperty('RequestItems');
            expect(loggedInput).toEqual({ tables: [TableName] });
        });

        it('batchWrite logs only the table names at INFO level', async () => {
            ddbMock.on(BatchWriteCommand).resolves({});
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new DynamoDBService({
                client: DynamoDBDocumentClient.from(new DynamoDBClient({})),
                logger,
            });

            await service.batchWrite({
                RequestItems: {
                    [TableName]: [{ PutRequest: { Item: { pk: 'a', email: 'pii@example.com' } } }],
                },
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).not.toHaveProperty('RequestItems');
            expect(loggedInput).toEqual({ tables: [TableName] });
        });
    });

    describe('single-item log shape', () => {
        const buildLoggedService = () => {
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new DynamoDBService({
                client: DynamoDBDocumentClient.from(new DynamoDBClient({})),
                logger,
            });
            return { service, infoSpy };
        };

        const loggedInputFrom = (spy: ReturnType<typeof vi.spyOn>) => {
            const [, payload] = spy.mock.calls[0] ?? [];
            return (payload as { input: object }).input;
        };

        it('getItem omits Key from the INFO log', async () => {
            ddbMock.on(GetCommand).resolves({});
            const { service, infoSpy } = buildLoggedService();

            await service.getItem({ TableName, Key: { pk: 'customer-123' } });

            expect(loggedInputFrom(infoSpy)).not.toHaveProperty('Key');
        });

        it('putItem omits Item and ExpressionAttributeValues from the INFO log', async () => {
            ddbMock.on(PutCommand).resolves({});
            const { service, infoSpy } = buildLoggedService();

            await service.putItem({
                TableName,
                Item: { pk: 'a', email: 'pii@example.com' },
                ConditionExpression: 'attribute_not_exists(pk) AND email <> :forbidden',
                ExpressionAttributeValues: { ':forbidden': 'banned@example.com' },
            });

            const logged = loggedInputFrom(infoSpy);
            expect(logged).not.toHaveProperty('Item');
            expect(logged).not.toHaveProperty('ExpressionAttributeValues');
        });

        it('updateItem omits Key and ExpressionAttributeValues from the INFO log', async () => {
            ddbMock.on(UpdateCommand).resolves({});
            const { service, infoSpy } = buildLoggedService();

            await service.updateItem({
                TableName,
                Key: { pk: 'a' },
                UpdateExpression: 'SET email = :e',
                ExpressionAttributeValues: { ':e': 'pii@example.com' },
            });

            const logged = loggedInputFrom(infoSpy);
            expect(logged).not.toHaveProperty('Key');
            expect(logged).not.toHaveProperty('ExpressionAttributeValues');
        });

        it('deleteItem omits Key and ExpressionAttributeValues from the INFO log', async () => {
            ddbMock.on(DeleteCommand).resolves({});
            const { service, infoSpy } = buildLoggedService();

            await service.deleteItem({
                TableName,
                Key: { pk: 'a' },
                ConditionExpression: 'email = :e',
                ExpressionAttributeValues: { ':e': 'pii@example.com' },
            });

            const logged = loggedInputFrom(infoSpy);
            expect(logged).not.toHaveProperty('Key');
            expect(logged).not.toHaveProperty('ExpressionAttributeValues');
        });

        it('query omits ExpressionAttributeValues from the INFO log', async () => {
            ddbMock.on(QueryCommand).resolves({});
            const { service, infoSpy } = buildLoggedService();

            await service.query({
                TableName,
                KeyConditionExpression: 'pk = :p',
                ExpressionAttributeValues: { ':p': 'customer-123' },
            });

            expect(loggedInputFrom(infoSpy)).not.toHaveProperty('ExpressionAttributeValues');
        });

        it('scan omits ExpressionAttributeValues from the INFO log', async () => {
            ddbMock.on(ScanCommand).resolves({});
            const { service, infoSpy } = buildLoggedService();

            await service.scan({
                TableName,
                FilterExpression: 'email = :e',
                ExpressionAttributeValues: { ':e': 'pii@example.com' },
            });

            expect(loggedInputFrom(infoSpy)).not.toHaveProperty('ExpressionAttributeValues');
        });
    });

    describe('paginateItems', () => {
        it('omits ExpressionAttributeValues from the INFO log', async () => {
            ddbMock.on(QueryCommand).resolves({});
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new DynamoDBService({
                client: DynamoDBDocumentClient.from(new DynamoDBClient({})),
                logger,
            });

            const iterator = service.paginateItems({
                TableName,
                KeyConditionExpression: 'pk = :p',
                ExpressionAttributeValues: { ':p': 'pii-value' },
            });
            // Drain the generator so the log fires.
            // Drain the generator so the log fires.
            const items = [];
            for await (const item of iterator) items.push(item);

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            expect((payload as { input: object }).input).not.toHaveProperty(
                'ExpressionAttributeValues'
            );
        });

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
        it('omits ExpressionAttributeValues from the INFO log', async () => {
            ddbMock.on(ScanCommand).resolves({});
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new DynamoDBService({
                client: DynamoDBDocumentClient.from(new DynamoDBClient({})),
                logger,
            });

            const iterator = service.paginateScan({
                TableName,
                FilterExpression: 'email = :e',
                ExpressionAttributeValues: { ':e': 'pii@example.com' },
            });
            // Drain the generator so the log fires.
            const items = [];
            for await (const item of iterator) items.push(item);

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            expect((payload as { input: object }).input).not.toHaveProperty(
                'ExpressionAttributeValues'
            );
        });

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
