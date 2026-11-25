import { describe, expect, it } from 'vitest';
import { chunk, originalIndex } from './chunk';

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

describe('originalIndex', () => {
    it('returns the position within the first chunk unchanged, as a string', () => {
        expect(originalIndex(0, 10, 3)).toBe('3');
    });

    it('offsets the position by the preceding full chunks', () => {
        expect(originalIndex(2, 50, 7)).toBe('107');
    });

    it('recovers every item’s index in the list that chunk split', () => {
        const items = Array.from({ length: 120 }, (_, i) => `item-${i}`);

        const recovered = chunk(items, 50).flatMap((part, chunkIndex) =>
            part.map((_, position) => originalIndex(chunkIndex, 50, position))
        );

        expect(recovered).toEqual(items.map((_, i) => String(i)));
    });
});
