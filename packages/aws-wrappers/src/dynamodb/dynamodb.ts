import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    BatchGetCommand,
    BatchGetCommandInput,
    BatchGetCommandOutput,
    BatchWriteCommand,
    BatchWriteCommandInput,
    BatchWriteCommandOutput,
    DeleteCommand,
    DeleteCommandInput,
    DeleteCommandOutput,
    DynamoDBDocumentClient,
    GetCommand,
    GetCommandInput,
    paginateQuery,
    paginateScan,
    PutCommand,
    PutCommandInput,
    PutCommandOutput,
    QueryCommand,
    QueryCommandInput,
    QueryCommandOutput,
    ScanCommand,
    ScanCommandInput,
    ScanCommandOutput,
    UpdateCommand,
    UpdateCommandInput,
    UpdateCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import { filterFieldsForLogLevel } from '../util/redact';

const BATCH_WRITE_MAX_ATTEMPTS = 5;
const BATCH_WRITE_BASE_DELAY_MS = 200;

/**
 * Fields safe to log at INFO. Omits `Key` (may carry customer IDs / tenant IDs).
 * `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the full input.
 */
const GET_ITEM_SAFE_FIELDS: ReadonlyArray<keyof GetCommandInput> = [
    'TableName',
    'ConsistentRead',
    'ProjectionExpression',
    'ReturnConsumedCapacity',
    'ExpressionAttributeNames',
];

/**
 * Fields safe to log at INFO. Omits `Item` (the payload itself) and
 * `ExpressionAttributeValues` (values bound to ConditionExpression, often PII).
 * `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the full input.
 */
const PUT_ITEM_SAFE_FIELDS: ReadonlyArray<keyof PutCommandInput> = [
    'TableName',
    'ConditionExpression',
    'ExpressionAttributeNames',
    'ReturnValues',
    'ReturnConsumedCapacity',
    'ReturnItemCollectionMetrics',
    'ReturnValuesOnConditionCheckFailure',
];

/**
 * Fields safe to log at INFO. Omits `Key` and `ExpressionAttributeValues`.
 * `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the full input.
 */
const UPDATE_ITEM_SAFE_FIELDS: ReadonlyArray<keyof UpdateCommandInput> = [
    'TableName',
    'UpdateExpression',
    'ConditionExpression',
    'ExpressionAttributeNames',
    'ReturnValues',
    'ReturnConsumedCapacity',
    'ReturnItemCollectionMetrics',
    'ReturnValuesOnConditionCheckFailure',
];

/**
 * Fields safe to log at INFO. Omits `Key` and `ExpressionAttributeValues`
 * (the latter binds to ConditionExpression and may carry PII).
 * `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the full input.
 */
const DELETE_ITEM_SAFE_FIELDS: ReadonlyArray<keyof DeleteCommandInput> = [
    'TableName',
    'ConditionExpression',
    'ExpressionAttributeNames',
    'ReturnValues',
    'ReturnConsumedCapacity',
    'ReturnItemCollectionMetrics',
    'ReturnValuesOnConditionCheckFailure',
];

/**
 * Fields safe to log at INFO for `query` and `paginateItems`. Omits
 * `ExpressionAttributeValues` (values often carry PII) and `ExclusiveStartKey`
 * (pagination cursor includes Key shape). `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks
 * the full input.
 */
const QUERY_SAFE_FIELDS: ReadonlyArray<keyof QueryCommandInput> = [
    'TableName',
    'IndexName',
    'KeyConditionExpression',
    'FilterExpression',
    'ProjectionExpression',
    'ExpressionAttributeNames',
    'ConsistentRead',
    'ScanIndexForward',
    'Select',
    'Limit',
    'ReturnConsumedCapacity',
];

/**
 * Fields safe to log at INFO for `scan` and `paginateScan`. Omits
 * `ExpressionAttributeValues` and `ExclusiveStartKey`.
 * `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the full input.
 */
const SCAN_SAFE_FIELDS: ReadonlyArray<keyof ScanCommandInput> = [
    'TableName',
    'IndexName',
    'FilterExpression',
    'ProjectionExpression',
    'ExpressionAttributeNames',
    'ConsistentRead',
    'Select',
    'Limit',
    'Segment',
    'TotalSegments',
    'ReturnConsumedCapacity',
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const backoffDelay = (attempt: number) => {
    const exp = BATCH_WRITE_BASE_DELAY_MS * 2 ** attempt;
    return exp + Math.random() * exp;
};

/**
 * DynamoDB command input with a typed `Key`. Used to thread a caller-defined
 * key shape through the SDK input shape while preserving every other field.
 */
type WithTypedKey<TInput, K extends Record<string, unknown>> = Omit<TInput, 'Key'> & {
    Key: K;
};

/**
 * Wrapper around the AWS DynamoDB Document client providing structured
 * Powertools logging and X-Ray tracing by default.
 *
 * Items are automatically marshalled / unmarshalled via the document client —
 * callers work with plain TypeScript objects in both directions.
 */
export class DynamoDBService {
    private readonly client: DynamoDBDocumentClient;
    private readonly logger: Logger;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `DynamoDBDocumentClient`.
     * When supplied, the wrapper does not apply X-Ray instrumentation. When
     * omitted, a default `DynamoDBClient` is wrapped with `captureAWSv3Client`
     * *before* being passed to `DynamoDBDocumentClient.from`, so X-Ray
     * tracing captures every DynamoDB call.
     */
    constructor(opts?: { logger?: Logger; client?: DynamoDBDocumentClient }) {
        this.client =
            opts?.client ??
            DynamoDBDocumentClient.from(captureAWSv3Client(new DynamoDBClient({})), {
                marshallOptions: { removeUndefinedValues: true },
            });
        this.logger = opts?.logger ?? new Logger();
    }

    /**
     * Get an item from DynamoDB.
     * @template K - Shape of the partition / sort key.
     * @template R - Expected unmarshalled item shape.
     * @returns The item, or `undefined` if not found.
     */
    async getItem<
        K extends Record<string, unknown> = Record<string, unknown>,
        R extends Record<string, unknown> = Record<string, unknown>,
    >(input: WithTypedKey<GetCommandInput, K>): Promise<R | undefined> {
        this.logger.info('Getting DynamoDB item', {
            input: filterFieldsForLogLevel(
                this.logger,
                input as GetCommandInput,
                GET_ITEM_SAFE_FIELDS
            ),
        });
        const response = await this.client.send(new GetCommand(input as GetCommandInput));
        return response.Item as R | undefined;
    }

    /**
     * Put an item into DynamoDB. The caller's `Item` is typed as `T`, which
     * the document client marshalls automatically.
     * @template T - Type of the item being stored.
     */
    async putItem<T>(
        input: Omit<PutCommandInput, 'Item'> & { Item: T }
    ): Promise<PutCommandOutput> {
        this.logger.info('Putting DynamoDB item', {
            input: filterFieldsForLogLevel(
                this.logger,
                input as PutCommandInput,
                PUT_ITEM_SAFE_FIELDS
            ),
        });
        return this.client.send(new PutCommand(input as PutCommandInput));
    }

    /**
     * Update an item in DynamoDB. The `Attributes` field on the response is
     * typed as `R` — the caller should choose `R` to match their
     * `ReturnValues` setting:
     * - `NONE` (default): no `Attributes` returned.
     * - `ALL_OLD` / `ALL_NEW`: full item.
     * - `UPDATED_OLD` / `UPDATED_NEW`: only updated attributes (partial).
     * @template K - Shape of the partition / sort key.
     * @template R - Expected shape of the returned `Attributes`.
     */
    async updateItem<
        K extends Record<string, unknown> = Record<string, unknown>,
        R extends Record<string, unknown> = Record<string, unknown>,
    >(
        input: WithTypedKey<UpdateCommandInput, K>
    ): Promise<Omit<UpdateCommandOutput, 'Attributes'> & { Attributes?: R }> {
        this.logger.info('Updating DynamoDB item', {
            input: filterFieldsForLogLevel(
                this.logger,
                input as UpdateCommandInput,
                UPDATE_ITEM_SAFE_FIELDS
            ),
        });
        const response = await this.client.send(new UpdateCommand(input as UpdateCommandInput));
        return response as Omit<UpdateCommandOutput, 'Attributes'> & { Attributes?: R };
    }

    /**
     * Delete an item from DynamoDB. The `Attributes` field on the response is
     * typed as `R` — relevant when `ReturnValues: 'ALL_OLD'` is set.
     * @template K - Shape of the partition / sort key.
     * @template R - Expected shape of the returned `Attributes`.
     */
    async deleteItem<
        K extends Record<string, unknown> = Record<string, unknown>,
        R extends Record<string, unknown> = Record<string, unknown>,
    >(
        input: WithTypedKey<DeleteCommandInput, K>
    ): Promise<Omit<DeleteCommandOutput, 'Attributes'> & { Attributes?: R }> {
        this.logger.info('Deleting DynamoDB item', {
            input: filterFieldsForLogLevel(
                this.logger,
                input as DeleteCommandInput,
                DELETE_ITEM_SAFE_FIELDS
            ),
        });
        const response = await this.client.send(new DeleteCommand(input as DeleteCommandInput));
        return response as Omit<DeleteCommandOutput, 'Attributes'> & { Attributes?: R };
    }

    /**
     * Execute a DynamoDB Query. The full `QueryCommandOutput` is returned with
     * `Items` typed as `T[]` so callers retain pagination metadata
     * (`LastEvaluatedKey`, `Count`, etc.).
     * @template T - Expected shape of each unmarshalled item.
     */
    async query<T extends Record<string, unknown> = Record<string, unknown>>(
        input: QueryCommandInput
    ): Promise<Omit<QueryCommandOutput, 'Items'> & { Items?: T[] }> {
        this.logger.info('Querying DynamoDB', {
            input: filterFieldsForLogLevel(this.logger, input, QUERY_SAFE_FIELDS),
        });
        const response = await this.client.send(new QueryCommand(input));
        return response as Omit<QueryCommandOutput, 'Items'> & { Items?: T[] };
    }

    /**
     * Scan a DynamoDB table. The full `ScanCommandOutput` is returned with
     * `Items` typed as `T[]` so callers retain pagination metadata.
     *
     * Scan reads every item in the table, so cost and latency grow linearly
     * with table size; it is rarely the right tool in a runtime service.
     * Prefer, in order:
     *
     *   1. `query` with the table's partition key.
     *   2. `query` against a GSI or LSI whose key matches your access pattern.
     *   3. A sparse GSI populated only for the items you need to enumerate.
     *   4. A denormalised lookup item or table maintained on write.
     *
     * Legitimate scan use cases are mostly one-off admin work (export,
     * migration, audit). For those, prefer the AWS CLI or Console rather than
     * embedding a scan in a Lambda.
     *
     * @template T - Expected shape of each unmarshalled item.
     */
    async scan<T extends Record<string, unknown> = Record<string, unknown>>(
        input: ScanCommandInput
    ): Promise<Omit<ScanCommandOutput, 'Items'> & { Items?: T[] }> {
        this.logger.info('Scanning DynamoDB', {
            input: filterFieldsForLogLevel(this.logger, input, SCAN_SAFE_FIELDS),
        });
        const response = await this.client.send(new ScanCommand(input));
        return response as Omit<ScanCommandOutput, 'Items'> & { Items?: T[] };
    }

    /**
     * Batch-get items from one or more DynamoDB tables.
     *
     * Note: this method is intentionally **not** generic. `BatchGet`'s
     * `Responses` field is a multi-table `Record<string, item[]>` whose item
     * shapes can differ per table — no single `T` can soundly describe it.
     * Callers should narrow the result type at the call site.
     */
    async batchGet(input: BatchGetCommandInput): Promise<BatchGetCommandOutput> {
        // Inline DEBUG check rather than `filterFieldsForLogLevel` because
        // `RequestItems` is a `Record<tableName, KeysAndAttributes>` — the
        // payload (`Keys[]`) lives inside the value, not as a top-level key
        // the helper could pick or drop.
        const isDebug = this.logger.getLevelName() === 'DEBUG';
        this.logger.info('Batch getting DynamoDB items', {
            input: isDebug ? input : { tables: Object.keys(input.RequestItems ?? {}) },
        });
        return this.client.send(new BatchGetCommand(input));
    }

    /**
     * Batch-write items to DynamoDB, retrying `UnprocessedItems` with jittered
     * exponential backoff. Up to 5 attempts (200ms base delay). Throws when
     * items remain unprocessed after the final attempt.
     */
    async batchWrite(input: BatchWriteCommandInput): Promise<BatchWriteCommandOutput> {
        // Inline DEBUG check rather than `filterFieldsForLogLevel` because
        // `RequestItems` is a `Record<tableName, WriteRequest[]>` — the
        // payload (`PutRequest.Item` / `DeleteRequest.Key`) lives inside the
        // value, not as a top-level key the helper could pick or drop.
        const isDebug = this.logger.getLevelName() === 'DEBUG';
        this.logger.info('Batch writing DynamoDB items', {
            input: isDebug ? input : { tables: Object.keys(input.RequestItems ?? {}) },
        });
        let current = input;
        for (let attempt = 0; attempt < BATCH_WRITE_MAX_ATTEMPTS; attempt++) {
            const response = await this.client.send(new BatchWriteCommand(current));
            const unprocessed = response.UnprocessedItems;
            if (!unprocessed || Object.keys(unprocessed).length === 0) return response;
            this.logger.warn('Retrying unprocessed DynamoDB items', {
                attempt: attempt + 1,
                tables: Object.keys(unprocessed),
            });
            if (attempt < BATCH_WRITE_MAX_ATTEMPTS - 1) await sleep(backoffDelay(attempt));
            current = { ...input, RequestItems: unprocessed };
        }
        throw new Error(`batchWrite failed after ${BATCH_WRITE_MAX_ATTEMPTS} attempts`);
    }

    /**
     * Paginate over Query results, yielding one unmarshalled item at a time.
     * @template T - Expected shape of each yielded item.
     */
    async *paginateItems<T extends Record<string, unknown> = Record<string, unknown>>(
        input: QueryCommandInput
    ): AsyncGenerator<T> {
        this.logger.info('Paginating DynamoDB query', {
            input: filterFieldsForLogLevel(this.logger, input, QUERY_SAFE_FIELDS),
        });
        const paginator = paginateQuery({ client: this.client }, input);
        for await (const page of paginator) {
            if (!page.Items) continue;
            for (const item of page.Items) yield item as T;
        }
    }

    /**
     * Paginate over Scan results, yielding one unmarshalled item at a time.
     * @template T - Expected shape of each yielded item.
     */
    async *paginateScan<T extends Record<string, unknown> = Record<string, unknown>>(
        input: ScanCommandInput
    ): AsyncGenerator<T> {
        this.logger.info('Paginating DynamoDB scan', {
            input: filterFieldsForLogLevel(this.logger, input, SCAN_SAFE_FIELDS),
        });
        const paginator = paginateScan({ client: this.client }, input);
        for await (const page of paginator) {
            if (!page.Items) continue;
            for (const item of page.Items) yield item as T;
        }
    }
}
