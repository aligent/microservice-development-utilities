import { describe, expect, it } from 'vitest';
import { chunk } from './chunk';

describe('chunk', () => {
    it('returns no chunks for an empty list', () => {
        expect(chunk([], 3)).toEqual([]);
    });

    it('splits a list that is an exact multiple of the chunk size', () => {
        expect(chunk([1, 2, 3, 4, 5, 6], 3)).toEqual([
            [1, 2, 3],
            [4, 5, 6],
        ]);
    });

    it('puts the remainder in a final shorter chunk', () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('returns a single chunk for a list shorter than the chunk size', () => {
        expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
    });
});
