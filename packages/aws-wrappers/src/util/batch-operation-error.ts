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
 * Distinct error codes in first-seen order, for the error message and the
 * warning log line.
 */
export function distinctCodes(failed: readonly BatchFailedEntry[]): string[] {
    const codes = failed.flatMap(entry => (entry.code === undefined ? [] : [entry.code]));
    return [...new Set(codes)];
}
