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

    it('uses the singular and omits the code list when a single entry has no code', () => {
        const error = new BatchOperationError([], [{ id: 'a', code: undefined, message: 'boom' }]);

        expect(error.message).toBe('Batch operation failed for 1 entry');
    });

    it('lists the code of a single failed entry', () => {
        const error = new BatchOperationError([], [{ id: 'a', code: 'Throttled', message: 'x' }]);

        expect(error.message).toBe('Batch operation failed for 1 entry (Throttled)');
    });

    it('omits the code list when no entry has a code', () => {
        const error = new BatchOperationError(
            [],
            [
                { id: 'a', code: undefined, message: undefined },
                { id: 'b', code: undefined, message: undefined },
            ]
        );

        expect(error.message).toBe('Batch operation failed for 2 entries');
    });

    it('is exported from the package entry point', () => {
        expect(entryPoint.BatchOperationError).toBe(BatchOperationError);
    });
});
