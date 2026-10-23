import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';

/**
 * One entry a batch operation rejected. Deliberately limited to identifier,
 * code and message so the error never carries message bodies, attributes or
 * any other payload the caller sent. For S3 the identifier is the object key;
 * for SSM it is the parameter path.
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
 * and `SSM.getParameters`, whose `results` are empty.
 * `failed` is the normalised list of rejected entries across all chunks.
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
        super(
            `Batch operation failed for ${failed.length} entries (${distinctCodes(failed).join(', ')})`
        );
    }
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
 * accepted. Returns `results` untouched when nothing failed; otherwise warns
 * and throws a {@link BatchOperationError}.
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
 * Throws a {@link BatchOperationError} for operations whose `results` aren't a
 * plain list of SDK outputs, such as `S3.emptyBucket`. Returns `results`
 * untouched when `failed` is empty.
 */
export function throwIfAny<TResult>(
    logger: LoggerInterface,
    operation: string,
    results: TResult[],
    failed: BatchFailedEntry[]
): TResult[] {
    if (failed.length === 0) return results;

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
