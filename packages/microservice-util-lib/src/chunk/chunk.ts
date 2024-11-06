/**
 * Split an array into chunks of a certain size
 * @param source the array to split up
 * @param chunkSize the size of each chunk. (The final chunk will be whatever is remaining)
 * @example
 * ```ts
 * chunkBy([1, 2, 3, 4, 5, 6, 7], 2) // [[1, 2], [3, 4], [5, 6], [7]]
 * ```
 */
function chunkBy<ArrayItem>(source: ArrayItem[], chunkSize: number) {
    if (chunkSize <= 0) {
        throw new Error(`Cannot create chunks of size ${chunkSize} (0 or less)`);
    }

    const numberOfChunks = Math.ceil(source.length / chunkSize);
    return Array.from(new Array(numberOfChunks), (_, i) => {
        return source.slice(i * chunkSize, (i + 1) * chunkSize);
    });
}

export default chunkBy;
