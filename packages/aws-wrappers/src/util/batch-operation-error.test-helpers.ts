import { BatchOperationError } from './batch-operation-error.js';

/**
 * Awaits a batch call that is expected to throw and returns the
 * `BatchOperationError` so a test can assert on its contents. Fails the test
 * if the call resolves or throws anything else.
 */
export async function batchFailure<TResult>(
    promise: Promise<TResult[]>
): Promise<BatchOperationError<TResult>> {
    const error = await promise.then(
        () => undefined,
        (thrown: unknown) => thrown
    );
    if (!(error instanceof BatchOperationError)) {
        throw new Error(`Expected a BatchOperationError, got: ${String(error)}`);
    }
    return error;
}
