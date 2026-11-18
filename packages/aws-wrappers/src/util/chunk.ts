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
