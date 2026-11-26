import { Logger } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';
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
import xray from 'aws-xray-sdk-core';
import { BatchFailedEntry, throwBatchFailure } from '../util/batch-operation-error.js';
import { redactInput } from '../util/redact.js';

const BATCH_WRITE_MAX_ATTEMPTS = 5;
const BATCH_WRITE_BASE_DELAY_MS = 200;
const BATCH_GET_MAX_ATTEMPTS = 5;
const BATCH_GET_BASE_DELAY_MS = 200;

/**
 * Safe log shape for the batch methods. `RequestItems` is keyed by table name
 * with the payload (`Keys`, `Item`) nested inside each value, so it can't be
 * an allowlisted field and is reduced to the table names instead.
 */
function summariseTables(input: BatchGetCommandInput | BatchWriteCommandInput): {
    tables: string[];
} {
    return { tables: Object.keys(input.RequestItems ?? {}) };
}

interface PendingTable {
    table: string;
    count: number;
}

/**
 * The tables that still have unprocessed keys or writes. Tables whose list is
 * empty are dropped, so an empty result means there is nothing left to retry.
 */
function pendingCounts<TUnprocessed>(
    unprocessed: Record<string, TUnprocessed>,
    countOf: (entry: TUnprocessed) => number | undefined
): PendingTable[] {
    return Object.entries(unprocessed)
        .map(([table, entry]) => ({ table, count: countOf(entry) ?? 0 }))
        .filter(({ count }) => count > 0);
}

/**
 * One failed entry per request still unprocessed after the final attempt. The
 * `id` is the table name plus the position within that table's unprocessed
 * list — deliberately not the key or item, which is caller data and must not
 * reach the error message or the warning. The position indexes into the
 * `UnprocessedKeys` / `UnprocessedItems` the error carries in `results`.
 */
function unprocessedEntries(
    pending: readonly PendingTable[],
    code: 'UnprocessedKeys' | 'UnprocessedItems',
    attempts: number
): BatchFailedEntry[] {
    return pending.flatMap(({ table, count }) =>
        Array.from({ length: count }, (_, index) => ({
            id: `${table}[${index}]`,
            code,
            message: `Still unprocessed after ${attempts} attempts`,
        }))
    );
}

/**
 * Fields safe to log at INFO. Omits `Key` (may carry customer IDs / tenant IDs).
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
 * (pagination cursor includes Key shape).
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
const backoffDelay = (attempt: number, baseDelayMs: number) => {
    const exp = baseDelayMs * 2 ** attempt;
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
 * Where a method's input carries payloads, secret material or PII, the INFO
 * log line omits them; the verbose levels (`POWERTOOLS_LOG_LEVEL=DEBUG` or
 * `TRACE`) log full SDK inputs.
 *
 * Items are automatically marshalled / unmarshalled via the document client —
 * callers work with plain TypeScript objects in both directions.
 */
export class DynamoDBService {
    private readonly client: DynamoDBDocumentClient;
    private readonly logger: LoggerInterface;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `DynamoDBDocumentClient`.
     * When supplied, the wrapper does not apply X-Ray instrumentation. When
     * omitted, a default `DynamoDBClient` is wrapped with `captureAWSv3Client`
     * *before* being passed to `DynamoDBDocumentClient.from`, so X-Ray
     * tracing captures every DynamoDB call.
     */
    constructor(opts?: { logger?: LoggerInterface; client?: DynamoDBDocumentClient }) {
        this.client =
            opts?.client ??
            DynamoDBDocumentClient.from(xray.captureAWSv3Client(new DynamoDBClient({})), {
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
            input: redactInput(this.logger, input as GetCommandInput, GET_ITEM_SAFE_FIELDS),
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
            input: redactInput(this.logger, input as PutCommandInput, PUT_ITEM_SAFE_FIELDS),
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
            input: redactInput(this.logger, input as UpdateCommandInput, UPDATE_ITEM_SAFE_FIELDS),
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
            input: redactInput(this.logger, input as DeleteCommandInput, DELETE_ITEM_SAFE_FIELDS),
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
            input: redactInput(this.logger, input, QUERY_SAFE_FIELDS),
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
            input: redactInput(this.logger, input, SCAN_SAFE_FIELDS),
        });
        const response = await this.client.send(new ScanCommand(input));
        return response as Omit<ScanCommandOutput, 'Items'> & { Items?: T[] };
    }

    /**
     * Batch-get items from one or more DynamoDB tables, retrying
     * `UnprocessedKeys` with jittered exponential backoff. Up to 5 attempts
     * (200ms base delay). `Responses` are merged across attempts, keyed by
     * table name.
     *
     * Note: this method is intentionally **not** generic. `BatchGet`'s
     * `Responses` field is a multi-table `Record<string, item[]>` whose item
     * shapes can differ per table — no single `T` can soundly describe it.
     * Callers should narrow the result type at the call site.
     *
     * @throws {@link BatchOperationError} when keys remain unprocessed after
     * the final attempt. `results` holds one output: the merged `Responses`
     * retrieved so far, plus the still-pending `UnprocessedKeys` to retry.
     * `failed` has one entry per pending key with `code: 'UnprocessedKeys'`
     * and an `id` of `<table>[<index>]`, the key's position in
     * `results[0].UnprocessedKeys[<table>].Keys`. The `failed` list never
     * carries key values; `results` does, as it is data the caller requested,
     * so don't log the error object itself (see {@link BatchOperationError}).
     * Request-level SDK exceptions propagate unchanged.
     */
    async batchGet(input: BatchGetCommandInput): Promise<BatchGetCommandOutput> {
        this.logger.info('Batch getting DynamoDB items', {
            input: redactInput(this.logger, input, summariseTables),
        });

        const mergedResponses: Record<string, Array<Record<string, unknown>>> = {};
        const attempt = async (request: BatchGetCommandInput) => {
            const response = await this.client.send(new BatchGetCommand(request));
            for (const [table, items] of Object.entries(response.Responses ?? {})) {
                mergedResponses[table] = [...(mergedResponses[table] ?? []), ...items];
            }
            const unprocessed = response.UnprocessedKeys ?? {};
            return {
                output: { ...response, Responses: mergedResponses },
                unprocessed,
                pending: pendingCounts(unprocessed, ({ Keys }) => Keys?.length),
            };
        };

        let current = input;
        for (let attemptNumber = 1; attemptNumber < BATCH_GET_MAX_ATTEMPTS; attemptNumber++) {
            const { output, unprocessed, pending } = await attempt(current);
            if (pending.length === 0) return output;
            this.logger.warn('Retrying unprocessed DynamoDB items', {
                attempt: attemptNumber,
                tables: Object.keys(unprocessed),
            });
            await sleep(backoffDelay(attemptNumber - 1, BATCH_GET_BASE_DELAY_MS));
            current = { ...input, RequestItems: unprocessed };
        }

        const { output, pending } = await attempt(current);
        if (pending.length === 0) return output;
        return throwBatchFailure(
            this.logger,
            'DynamoDB batchGet',
            [output],
            unprocessedEntries(pending, 'UnprocessedKeys', BATCH_GET_MAX_ATTEMPTS)
        );
    }

    /**
     * Batch-write items to DynamoDB, retrying `UnprocessedItems` with jittered
     * exponential backoff. Up to 5 attempts (200ms base delay).
     *
     * @throws {@link BatchOperationError} when items remain unprocessed after
     * the final attempt. `results` holds one output: the last response, whose
     * `UnprocessedItems` are the writes still to retry. `failed` has one entry
     * per pending write with `code: 'UnprocessedItems'` and an `id` of
     * `<table>[<index>]`, the write's position in
     * `results[0].UnprocessedItems[<table>]`. The `failed` list never carries
     * item data; `results` does, as it is data the caller supplied, so don't
     * log the error object itself (see {@link BatchOperationError}).
     * Request-level SDK exceptions propagate unchanged.
     */
    async batchWrite(input: BatchWriteCommandInput): Promise<BatchWriteCommandOutput> {
        this.logger.info('Batch writing DynamoDB items', {
            input: redactInput(this.logger, input, summariseTables),
        });
        const attempt = async (request: BatchWriteCommandInput) => {
            const response = await this.client.send(new BatchWriteCommand(request));
            const unprocessed = response.UnprocessedItems ?? {};
            return {
                response,
                unprocessed,
                pending: pendingCounts(unprocessed, writes => writes.length),
            };
        };

        let current = input;
        for (let attemptNumber = 1; attemptNumber < BATCH_WRITE_MAX_ATTEMPTS; attemptNumber++) {
            const { response, unprocessed, pending } = await attempt(current);
            if (pending.length === 0) return response;
            this.logger.warn('Retrying unprocessed DynamoDB items', {
                attempt: attemptNumber,
                tables: Object.keys(unprocessed),
            });
            await sleep(backoffDelay(attemptNumber - 1, BATCH_WRITE_BASE_DELAY_MS));
            current = { ...input, RequestItems: unprocessed };
        }

        const { response, pending } = await attempt(current);
        if (pending.length === 0) return response;
        return throwBatchFailure(
            this.logger,
            'DynamoDB batchWrite',
            [response],
            unprocessedEntries(pending, 'UnprocessedItems', BATCH_WRITE_MAX_ATTEMPTS)
        );
    }

    /**
     * Paginate over Query results, yielding one unmarshalled item at a time.
     *
     * **`Limit` is a page size, not a total cap.** DynamoDB applies it per
     * request, and this method walks every page until `LastEvaluatedKey` is
     * exhausted — so `paginateItems({ Limit: 10 })` yields *every* matching
     * item, in pages of 10, not the first 10 items.
     *
     * To bound the number of items, `break` out of the loop. This is an
     * `AsyncGenerator`, so `break` calls its `return()`, which unwinds the
     * pagination and issues no further requests:
     *
     * ```ts
     * const firstTen: Item[] = [];
     * for await (const item of ddb.paginateItems<Item>(input)) {
     *     firstTen.push(item);
     *     if (firstTen.length === 10) break;
     * }
     * ```
     *
     * `Limit` remains the right knob for tuning per-request consumed capacity
     * and page memory — set it deliberately, just don't expect it to stop the
     * walk.
     *
     * @template T - Expected shape of each yielded item.
     */
    async *paginateItems<T extends Record<string, unknown> = Record<string, unknown>>(
        input: QueryCommandInput
    ): AsyncGenerator<T> {
        this.logger.info('Paginating DynamoDB query', {
            input: redactInput(this.logger, input, QUERY_SAFE_FIELDS),
        });
        const paginator = paginateQuery({ client: this.client }, input);
        for await (const page of paginator) {
            if (!page.Items) continue;
            for (const item of page.Items) yield item as T;
        }
    }

    /**
     * Paginate over Scan results, yielding one unmarshalled item at a time.
     *
     * **`Limit` is a page size, not a total cap** — see `paginateItems` for the
     * detail. `break` out of the loop to bound the number of items; `Limit`
     * stays the right knob for per-request consumed capacity and page memory.
     *
     * @template T - Expected shape of each yielded item.
     */
    async *paginateScan<T extends Record<string, unknown> = Record<string, unknown>>(
        input: ScanCommandInput
    ): AsyncGenerator<T> {
        this.logger.info('Paginating DynamoDB scan', {
            input: redactInput(this.logger, input, SCAN_SAFE_FIELDS),
        });
        const paginator = paginateScan({ client: this.client }, input);
        for await (const page of paginator) {
            if (!page.Items) continue;
            for (const item of page.Items) yield item as T;
        }
    }
}
