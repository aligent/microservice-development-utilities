import { Logger } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';
import {
    CopyObjectCommand,
    CopyObjectCommandInput,
    CopyObjectCommandOutput,
    DeleteObjectCommand,
    DeleteObjectCommandInput,
    DeleteObjectCommandOutput,
    DeleteObjectsCommand,
    DeleteObjectsCommandOutput,
    GetObjectCommand,
    GetObjectCommandInput,
    GetObjectCommandOutput,
    HeadObjectCommand,
    HeadObjectCommandInput,
    HeadObjectCommandOutput,
    paginateListObjectsV2,
    PutObjectCommand,
    PutObjectCommandInput,
    PutObjectCommandOutput,
    S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import xray from 'aws-xray-sdk-core';
import { filterFieldsForLogLevel } from '../util/redact.js';

const DEFAULT_PRESIGNED_URL_EXPIRES_IN_SECONDS = 3600;

const DELETE_OBJECTS_BATCH_LIMIT = 1000;

/** Tight wrapper input type for `putObject`. */
type PutObjectInput = Required<Pick<PutObjectCommandInput, 'Bucket' | 'Key' | 'Body'>>;

/** Tight wrapper input type for `putJsonObject`. */
type PutJsonObjectInput<T> = {
    Bucket: string;
    Key: string;
    Body: T;
    Metadata?: Record<string, string>;
};

/**
 * Fields safe to log at INFO for `putObject`. Omits `Body` (object payload).
 * `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the full input.
 */
const PUT_OBJECT_SAFE_FIELDS: ReadonlyArray<keyof PutObjectInput> = ['Bucket', 'Key'];

/**
 * Fields safe to log at INFO for `putJsonObject`. Omits `Body` (the
 * unserialised JSON payload). `Metadata` is included (operational labels).
 * `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the full input.
 */
const PUT_JSON_OBJECT_SAFE_FIELDS: ReadonlyArray<keyof PutJsonObjectInput<unknown>> = [
    'Bucket',
    'Key',
    'Metadata',
];

/**
 * Wrapper around the AWS S3 client providing structured Powertools logging
 * and X-Ray tracing by default.
 *
 * Input shapes are intentionally tight (Bucket/Key/Body only). Callers
 * needing SDK-level options not exposed here (server-side encryption,
 * tagging, version IDs) should use `S3Client` directly.
 */
export class S3Service {
    private readonly client: S3Client;
    private readonly logger: LoggerInterface;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `S3Client`. When supplied,
     * the wrapper does not apply X-Ray instrumentation.
     */
    constructor(opts?: { logger?: LoggerInterface; client?: S3Client }) {
        this.client = opts?.client ?? xray.captureAWSv3Client(new S3Client());
        this.logger = opts?.logger ?? new Logger();
    }

    /**
     * Put an object into S3.
     *
     * Note: the structured log line only includes `Bucket` and `Key` —
     * `Body` is omitted to avoid spilling large payloads or sensitive
     * content into CloudWatch.
     *
     * @param input - Bucket, Key, and Body of the object to store.
     */
    async putObject(input: PutObjectInput): Promise<PutObjectCommandOutput> {
        this.logger.info('Putting S3 object', {
            input: filterFieldsForLogLevel(this.logger, input, PUT_OBJECT_SAFE_FIELDS),
        });
        return this.client.send(new PutObjectCommand(input));
    }

    /**
     * Serialise a value to JSON and store it as an S3 object.
     *
     * Note: the structured log line only includes `Bucket` and `Key` —
     * the JSON-encoded body is omitted to avoid spilling potentially
     * large or sensitive content into CloudWatch.
     *
     * @template T - Type of the value being stored.
     */
    async putJsonObject<T>(input: PutJsonObjectInput<T>): Promise<PutObjectCommandOutput> {
        this.logger.info('Putting S3 JSON object', {
            input: filterFieldsForLogLevel(this.logger, input, PUT_JSON_OBJECT_SAFE_FIELDS),
        });
        return this.client.send(
            new PutObjectCommand({
                Bucket: input.Bucket,
                Key: input.Key,
                Body: JSON.stringify(input.Body),
                Metadata: input.Metadata,
            })
        );
    }

    /**
     * Get an object from S3.
     */
    async getObject(
        input: Required<Pick<GetObjectCommandInput, 'Bucket' | 'Key'>>
    ): Promise<GetObjectCommandOutput> {
        this.logger.info('Getting S3 object', { input });
        return this.client.send(new GetObjectCommand(input));
    }

    /**
     * Get an object from S3 and return its body as a string.
     * @returns The object body as a string, or `undefined` if the response
     * has no body.
     */
    async getObjectBody(
        input: Required<Pick<GetObjectCommandInput, 'Bucket' | 'Key'>>
    ): Promise<string | undefined> {
        this.logger.info('Getting S3 object body', { input });
        const response = await this.client.send(new GetObjectCommand(input));
        return response.Body?.transformToString();
    }

    /**
     * Get an object from S3 and parse it as JSON.
     * @template T - Expected type of the parsed value.
     * @returns The parsed value, or `undefined` if the response has no body.
     * @throws If the body is non-empty and not valid JSON.
     */
    async getJsonObject<T>(
        input: Required<Pick<GetObjectCommandInput, 'Bucket' | 'Key'>>
    ): Promise<T | undefined> {
        this.logger.info('Getting S3 JSON object', { input });
        const response = await this.client.send(new GetObjectCommand(input));
        const body = await response.Body?.transformToString();
        return body ? (JSON.parse(body) as T) : undefined;
    }

    /**
     * Fetch the metadata for an S3 object without downloading its body.
     */
    async headObject(
        input: Required<Pick<HeadObjectCommandInput, 'Bucket' | 'Key'>>
    ): Promise<HeadObjectCommandOutput> {
        this.logger.info('Fetching S3 object metadata', { input });
        return this.client.send(new HeadObjectCommand(input));
    }

    /**
     * Copy an object within S3.
     */
    async copyObject(
        input: Required<Pick<CopyObjectCommandInput, 'Bucket' | 'Key' | 'CopySource'>>
    ): Promise<CopyObjectCommandOutput> {
        this.logger.info('Copying S3 object', { input });
        return this.client.send(new CopyObjectCommand(input));
    }

    /**
     * List object keys under a bucket and optional prefix, auto-paginating
     * across all pages.
     */
    async listObjects(bucket: string, prefix?: string): Promise<string[]> {
        this.logger.info('Listing S3 objects', { input: { bucket, prefix } });
        const paginator = paginateListObjectsV2(
            { client: this.client },
            { Bucket: bucket, Prefix: prefix }
        );
        const keys: string[] = [];
        for await (const page of paginator) {
            for (const object of page.Contents ?? []) {
                if (object.Key) keys.push(object.Key);
            }
        }
        return keys;
    }

    /**
     * List and JSON-parse every object under a bucket and optional prefix.
     * Auto-paginated. Objects without a body are skipped.
     * @template T - Expected type of each parsed object.
     */
    async getAllObjects<T>(bucket: string, prefix?: string): Promise<T[]> {
        this.logger.info('Getting all S3 objects', { input: { bucket, prefix } });
        const paginator = paginateListObjectsV2(
            { client: this.client },
            { Bucket: bucket, Prefix: prefix }
        );
        const bodies: T[] = [];
        for await (const page of paginator) {
            for (const object of page.Contents ?? []) {
                if (!object.Key) continue;
                const response = await this.client.send(
                    new GetObjectCommand({ Bucket: bucket, Key: object.Key })
                );
                const body = await response.Body?.transformToString();
                if (body) bodies.push(JSON.parse(body) as T);
            }
        }
        return bodies;
    }

    /**
     * Generate a presigned URL that callers can use to GET or PUT an S3 object
     * directly, without going through the wrapper. The signing happens against
     * the wrapper's `S3Client`, so callers do not need their own client.
     *
     * GET URLs are signed with `ResponseContentDisposition: 'attachment'` so
     * browsers download the object rather than rendering it in-place.
     *
     * The input shape is an inline object (rather than the `Required<Pick<...>>`
     * pattern used by other S3 methods) because this method wraps two SDK
     * commands rather than one, and `action` / `expiresIn` are wrapper-level
     * concerns with no SDK-input equivalent.
     *
     * @param input.Bucket - The S3 bucket name.
     * @param input.Key - The S3 object key.
     * @param input.action - `'get'` to download, `'put'` to upload.
     * @param input.expiresIn - URL lifetime in seconds. Defaults to 3600 (1 hour).
     */
    async getPresignedUrl(input: {
        Bucket: string;
        Key: string;
        action: 'get' | 'put';
        expiresIn?: number;
    }): Promise<string> {
        const expiresIn = input.expiresIn ?? DEFAULT_PRESIGNED_URL_EXPIRES_IN_SECONDS;
        this.logger.info('Generating S3 presigned URL', {
            input: { Bucket: input.Bucket, Key: input.Key, action: input.action, expiresIn },
        });
        const command =
            input.action === 'get'
                ? new GetObjectCommand({
                      Bucket: input.Bucket,
                      Key: input.Key,
                      ResponseContentDisposition: 'attachment',
                  })
                : new PutObjectCommand({ Bucket: input.Bucket, Key: input.Key });
        return getSignedUrl(this.client, command, { expiresIn });
    }

    /**
     * Delete a single object from S3.
     */
    async deleteObject(
        input: Required<Pick<DeleteObjectCommandInput, 'Bucket' | 'Key'>>
    ): Promise<DeleteObjectCommandOutput> {
        this.logger.info('Deleting S3 object', { input });
        return this.client.send(new DeleteObjectCommand(input));
    }

    /**
     * Delete multiple objects from S3, auto-chunking the request into batches
     * of 1000 keys (the S3-enforced DeleteObjects limit). Returns one output
     * per chunk.
     */
    async deleteObjects(bucket: string, keys: string[]): Promise<DeleteObjectsCommandOutput[]> {
        // Inline DEBUG check rather than `filterFieldsForLogLevel` because the
        // safe log shape includes the computed `keyCount`, which isn't a key
        // on any SDK input type.
        const isDebug = this.logger.getLevelName() === 'DEBUG';
        this.logger.info('Deleting S3 objects', {
            input: isDebug ? { bucket, keys } : { bucket, keyCount: keys.length },
        });
        const results: DeleteObjectsCommandOutput[] = [];
        for (let i = 0; i < keys.length; i += DELETE_OBJECTS_BATCH_LIMIT) {
            const batch = keys.slice(i, i + DELETE_OBJECTS_BATCH_LIMIT);
            results.push(
                await this.client.send(
                    new DeleteObjectsCommand({
                        Bucket: bucket,
                        Delete: { Objects: batch.map(Key => ({ Key })) },
                    })
                )
            );
        }
        return results;
    }

    /**
     * Delete every object in a bucket. Streams the listing page-by-page and
     * delegates each page's deletion to `deleteObjects`, so peak memory stays
     * bounded by one page (~1000 keys) regardless of bucket size.
     * @returns The keys of every deleted object.
     */
    async emptyBucket(bucket: string): Promise<string[]> {
        this.logger.info('Emptying S3 bucket', { input: { bucket } });
        const paginator = paginateListObjectsV2({ client: this.client }, { Bucket: bucket });
        const deletedKeys: string[] = [];
        for await (const page of paginator) {
            const keys: string[] = (page.Contents ?? []).flatMap(o => (o.Key ? [o.Key] : []));
            if (keys.length === 0) continue;
            await this.deleteObjects(bucket, keys);
            deletedKeys.push(...keys);
        }
        return deletedKeys;
    }
}
