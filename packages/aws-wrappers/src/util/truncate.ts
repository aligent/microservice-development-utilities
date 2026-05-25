/**
 * Truncate a UTF-8 string to fit within `maxBytes` when encoded as UTF-8.
 *
 * Walks back from the cut point to the start of the previous codepoint, so the
 * result is never a malformed UTF-8 sequence. Returns the input unchanged when
 * it already fits.
 */
export function truncateUtf8(str: string, maxBytes: number): string {
    const buf = Buffer.from(str, 'utf8');
    if (buf.length <= maxBytes) return str;
    let end = maxBytes;
    while (end > 0) {
        const byte = buf[end];
        if (byte === undefined || (byte & 0xc0) !== 0x80) break;
        end--;
    }
    return buf.toString('utf8', 0, end);
}

/**
 * Truncate a string to at most `maxChars` Unicode codepoints. Splits the
 * string via `Array.from` so surrogate pairs (emoji, supplementary-plane
 * characters) are not split in the middle. Returns the input unchanged when
 * it already fits.
 */
export function truncateCodepoints(str: string, maxChars: number): string {
    const codepoints = Array.from(str);
    if (codepoints.length <= maxChars) return str;
    return codepoints.slice(0, maxChars).join('');
}
