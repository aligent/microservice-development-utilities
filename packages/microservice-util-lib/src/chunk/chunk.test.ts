import chunkBy from './chunk.js';

describe('chunkBy', () => {
    it('should split up an array into sub-arrays of a certain size', () => {
        const arr = [1, 2, 3, 4];
        expect(chunkBy(arr, 2)).toEqual([
            [1, 2],
            [3, 4],
        ]);
    });

    it('should put leftover items in the last chunk', () => {
        const arr = [1, 2, 3, 4, 5];
        expect(chunkBy(arr, 2)).toEqual([[1, 2], [3, 4], [5]]);
    });
});
