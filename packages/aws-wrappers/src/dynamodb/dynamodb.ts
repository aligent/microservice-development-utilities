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

const BATCH_WRITE_MAX_ATTEMPTS = 5;
const BATCH_WRITE_BASE_DELAY_MS = 200;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const backoffDelay = (attempt: number) => {
    const exp = BATCH_WRITE_BASE_DELAY_MS * 2 ** attempt;
    return exp + Math.random() * exp;
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
     * @param opts.logger - Optional Powertools logger. Defaults to a logger with
     * `serviceName: 'DynamoDBService'`.
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
        this.logger = opts?.logger ?? new Logger({ serviceName: 'DynamoDBService' });
    }

    /**
     * Get an item from DynamoDB.
     * @template T - Expected unmarshalled item shape.
     * @returns The item, or `undefined` if not found.
     */
    async getItem<T = Record<string, unknown>>(input: GetCommandInput): Promise<T | undefined> {
        this.logger.info('Getting DynamoDB item', { input });
        const response = await this.client.send(new GetCommand(input));
        return response.Item as T | undefined;
    }

    /**
     * Put an item into DynamoDB. The caller's `Item` is typed as `T`, which
     * the document client marshalls automatically.
     * @template T - Type of the item being stored.
     */
    async putItem<T>(
        input: Omit<PutCommandInput, 'Item'> & { Item: T }
    ): Promise<PutCommandOutput> {
        this.logger.info('Putting DynamoDB item', { input });
        return this.client.send(new PutCommand(input as PutCommandInput));
    }

    /**
     * Update an item in DynamoDB. The `Attributes` field on the response is
     * typed as `T` — the caller should choose `T` to match their
     * `ReturnValues` setting:
     * - `NONE` (default): no `Attributes` returned.
     * - `ALL_OLD` / `ALL_NEW`: full item.
     * - `UPDATED_OLD` / `UPDATED_NEW`: only updated attributes (partial).
     * @template T - Expected shape of the returned `Attributes`.
     */
    async updateItem<T = Record<string, unknown>>(
        input: UpdateCommandInput
    ): Promise<Omit<UpdateCommandOutput, 'Attributes'> & { Attributes?: T }> {
        this.logger.info('Updating DynamoDB item', { input });
        const response = await this.client.send(new UpdateCommand(input));
        return response as Omit<UpdateCommandOutput, 'Attributes'> & { Attributes?: T };
    }

    /**
     * Delete an item from DynamoDB. The `Attributes` field on the response is
     * typed as `T` — relevant when `ReturnValues: 'ALL_OLD'` is set.
     * @template T - Expected shape of the returned `Attributes`.
     */
    async deleteItem<T = Record<string, unknown>>(
        input: DeleteCommandInput
    ): Promise<Omit<DeleteCommandOutput, 'Attributes'> & { Attributes?: T }> {
        this.logger.info('Deleting DynamoDB item', { input });
        const response = await this.client.send(new DeleteCommand(input));
        return response as Omit<DeleteCommandOutput, 'Attributes'> & { Attributes?: T };
    }

    /**
     * Execute a DynamoDB Query. The full `QueryCommandOutput` is returned with
     * `Items` typed as `T[]` so callers retain pagination metadata
     * (`LastEvaluatedKey`, `Count`, etc.).
     * @template T - Expected shape of each unmarshalled item.
     */
    async query<T = Record<string, unknown>>(
        input: QueryCommandInput
    ): Promise<Omit<QueryCommandOutput, 'Items'> & { Items?: T[] }> {
        this.logger.info('Querying DynamoDB', { input });
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
    async scan<T = Record<string, unknown>>(
        input: ScanCommandInput
    ): Promise<Omit<ScanCommandOutput, 'Items'> & { Items?: T[] }> {
        this.logger.info('Scanning DynamoDB', { input });
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
        this.logger.info('Batch getting DynamoDB items', { input });
        return this.client.send(new BatchGetCommand(input));
    }

    /**
     * Batch-write items to DynamoDB, retrying `UnprocessedItems` with jittered
     * exponential backoff. Up to 5 attempts (200ms base delay). Throws when
     * items remain unprocessed after the final attempt.
     */
    async batchWrite(input: BatchWriteCommandInput): Promise<BatchWriteCommandOutput> {
        this.logger.info('Batch writing DynamoDB items', { input });
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
    async *paginateItems<T = Record<string, unknown>>(input: QueryCommandInput): AsyncGenerator<T> {
        this.logger.info('Paginating DynamoDB query', { input });
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
    async *paginateScan<T = Record<string, unknown>>(input: ScanCommandInput): AsyncGenerator<T> {
        this.logger.info('Paginating DynamoDB scan', { input });
        const paginator = paginateScan({ client: this.client }, input);
        for await (const page of paginator) {
            if (!page.Items) continue;
            for (const item of page.Items) yield item as T;
        }
    }
}
