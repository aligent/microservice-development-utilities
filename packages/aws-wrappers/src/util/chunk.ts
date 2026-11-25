/**
 * Split a list into consecutive chunks of at most `size` items, mirroring the
 * per-request caps the AWS APIs enforce on batch operations.
 */
export function chunk<T>(items: readonly T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

/**
 * The index, as a string, that an entry had in the list `chunk` split, given
 * its chunk number and its position within that chunk. Batch operations whose
 * entries carry no identifier of their own report failures by this index.
 * `chunk` fills every chunk but the last, so the chunk's offset is the chunk
 * number times the chunk size.
 */
export function originalIndex(chunkIndex: number, chunkSize: number, position: number): string {
    return String(chunkIndex * chunkSize + position);
}
