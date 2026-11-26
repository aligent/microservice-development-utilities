import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';

/**
 * One entry a batch operation rejected. Deliberately limited to identifier,
 * code and message so the error never carries message bodies, attributes or
 * any other payload the caller sent. For S3 the identifier is the object key;
 * for SSM it is the parameter path; for DynamoDB it is `<table>[<index>]`,
 * since a key or item is caller data.
 */
export interface BatchFailedEntry {
    id: string | undefined;
    code: string | undefined;
    message: string | undefined;
}

/**
 * Thrown by the batch methods once every chunk has been sent and at least one
 * entry was rejected.
 *
 * `results` holds the raw SDK output of every chunk, so the outputs of the
 * entries that succeeded (message ids, sequence numbers) stay readable. The
 * exceptions are `S3.emptyBucket`, whose `results` are per-page deleted keys,
 * `SSM.getParameters`, whose `results` are empty, and the DynamoDB batch
 * methods, whose `results` hold a single output (the last response, with the
 * `Responses` merged so far for `batchGet`) carrying what is still pending.
 * `failed` is the normalised list of rejected entries across all chunks.
 *
 * Do not pass the error object itself to a logger. `results` is an enumerable
 * property and the Powertools logger serialises every enumerable property of
 * an error, so `logger.error('…', error)` writes `results` to the log — which
 * for the DynamoDB batch methods holds the caller's keys and items. Log `name`,
 * `message` and `failed`, which never carry a payload, and read `results` only
 * to retry or recover.
 *
 * Match on `name` rather than `instanceof` if both the CJS and ESM builds of
 * this package may be loaded in one process.
 */
export class BatchOperationError<TResult = unknown> extends Error {
    override readonly name = 'BatchOperationError';

    constructor(
        readonly results: TResult[],
        readonly failed: BatchFailedEntry[]
    ) {
        super(failureMessage(failed));
    }
}

function failureMessage(failed: readonly BatchFailedEntry[]): string {
    const noun = failed.length === 1 ? 'entry' : 'entries';
    const codes = distinctCodes(failed);
    const suffix = codes.length === 0 ? '' : ` (${codes.join(', ')})`;
    return `Batch operation failed for ${failed.length} ${noun}${suffix}`;
}

/**
 * The shape SQS and SNS share for a rejected entry in a batch response.
 */
interface RejectedEntry {
    Id?: string | undefined;
    Code?: string | undefined;
    Message?: string | undefined;
}

/**
 * SQS and SNS report rejected entries under `Failed` on an otherwise
 * successful response, so a resolved chunk does not mean every entry was
 * accepted. Extracts those entries and delegates to {@link throwIfAny}.
 *
 * Only id, code and message are copied out — never the entry itself — so
 * neither the error nor the warning can leak a payload.
 */
export function throwIfAnyFailed<TResult extends { Failed?: RejectedEntry[] | undefined }>(
    logger: LoggerInterface,
    operation: string,
    results: TResult[]
): TResult[] {
    const failed: BatchFailedEntry[] = results.flatMap(result =>
        (result.Failed ?? []).map(({ Id, Code, Message }) => ({
            id: Id,
            code: Code,
            message: Message,
        }))
    );
    return throwIfAny(logger, operation, results, failed);
}

/**
 * The shape S3 `DeleteObjects` uses for a key it could not delete.
 */
interface DeleteError {
    Key?: string | undefined;
    Code?: string | undefined;
    Message?: string | undefined;
}

/**
 * S3 reports undeleted keys under `Errors` on an otherwise successful
 * `DeleteObjects` response. Same contract as {@link throwIfAnyFailed}; the
 * key is carried as the failed entry's `id`, and `VersionId` is dropped.
 */
export function throwIfAnyDeleteErrors<TResult extends { Errors?: DeleteError[] | undefined }>(
    logger: LoggerInterface,
    operation: string,
    results: TResult[]
): TResult[] {
    const failed: BatchFailedEntry[] = results.flatMap(result =>
        (result.Errors ?? []).map(({ Key, Code, Message }) => ({
            id: Key,
            code: Code,
            message: Message,
        }))
    );
    return throwIfAny(logger, operation, results, failed);
}

/**
 * Warn-and-throw step for services whose responses don't use the SQS/SNS
 * `Failed` shape and so extract their own rejected entries (`EventBridge.putEvents`),
 * or whose `results` aren't a plain list of SDK outputs (`S3.emptyBucket`).
 * Returns `results` untouched when `failed` is empty.
 *
 * Callers must build `failed` by copying id, code and message explicitly —
 * never by spreading the SDK entry — because it goes straight into the error
 * and the warning.
 */
export function throwIfAny<TResult>(
    logger: LoggerInterface,
    operation: string,
    results: TResult[],
    failed: BatchFailedEntry[]
): TResult[] {
    if (failed.length === 0) return results;
    return throwBatchFailure(logger, operation, results, failed);
}

/**
 * The warn-and-throw half of {@link throwIfAny}, for callers that already know
 * `failed` is non-empty and need the compiler to see that the call never
 * returns. The same rule applies: build `failed` by copying id, code and
 * message explicitly.
 */
export function throwBatchFailure<TResult>(
    logger: LoggerInterface,
    operation: string,
    results: TResult[],
    failed: BatchFailedEntry[]
): never {
    logger.warn(`${operation} had rejected entries`, {
        failedCount: failed.length,
        codes: distinctCodes(failed),
    });
    throw new BatchOperationError(results, failed);
}

/**
 * Distinct error codes in first-seen order, for the error message and the
 * warning log line.
 */
function distinctCodes(failed: readonly BatchFailedEntry[]): string[] {
    const codes = failed.flatMap(entry => (entry.code === undefined ? [] : [entry.code]));
    return [...new Set(codes)];
}
