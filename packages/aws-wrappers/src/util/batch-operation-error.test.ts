import { describe, expect, it } from 'vitest';
import * as entryPoint from '../index.js';
import { BatchOperationError } from './batch-operation-error.js';

describe('BatchOperationError', () => {
    const failed = [
        { id: 'a', code: 'InternalError', message: 'boom' },
        { id: 'b', code: 'InternalError', message: 'boom' },
        { id: 'c', code: 'Throttled', message: 'slow down' },
    ];

    it('carries the per-chunk results and the failed entries', () => {
        const results = [{ Successful: [] }, { Successful: [] }];

        const error = new BatchOperationError(results, failed);

        expect(error.results).toBe(results);
        expect(error.failed).toBe(failed);
    });

    it('is an Error with a stable name', () => {
        const error = new BatchOperationError([], failed);

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('BatchOperationError');
    });

    it('summarises the failure count and distinct error codes in the message', () => {
        const error = new BatchOperationError([], failed);

        expect(error.message).toBe(
            'Batch operation failed for 3 entries (InternalError, Throttled)'
        );
    });

    it('is exported from the package entry point', () => {
        expect(entryPoint.BatchOperationError).toBe(BatchOperationError);
    });
});
