import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';

/**
 * One entry a batch operation rejected. Deliberately limited to identifier,
 * code and message so the error never carries message bodies, attributes or
 * any other payload the caller sent.
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
 * entries that succeeded (message ids, sequence numbers) stay readable.
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
 * accepted. Extracts those entries and delegates to {@link throwIfRejected}.
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
    return throwIfRejected(logger, operation, results, failed);
}

/**
 * Warn-and-throw step for services whose responses don't use the SQS/SNS
 * `Failed` shape and so extract their own rejected entries. Returns `results`
 * untouched when `failed` is empty; otherwise warns and throws a
 * {@link BatchOperationError}.
 *
 * Callers must build `failed` by copying id, code and message explicitly —
 * never by spreading the SDK entry — because it goes straight into the error
 * and the warning.
 */
export function throwIfRejected<TResult>(
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
