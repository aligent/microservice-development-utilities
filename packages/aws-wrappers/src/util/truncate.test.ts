import { describe, expect, it } from 'vitest';
import { truncateCodepoints, truncateUtf8 } from './truncate';

describe('truncateUtf8', () => {
    it('returns the input unchanged when it fits in the byte budget', () => {
        expect(truncateUtf8('hello', 100)).toBe('hello');
    });

    it('truncates ASCII input at the byte boundary', () => {
        expect(truncateUtf8('abcdef', 3)).toBe('abc');
    });

    it('rolls back to the previous codepoint boundary for multi-byte characters', () => {
        // '世界' is two 3-byte characters; cutting at 4 bytes would split '界'.
        // The function must roll back to byte 3 (end of '世').
        const result = truncateUtf8('世界', 4);
        expect(result).toBe('世');
        expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(4);
    });

    it('rolls back across surrogate-pair emoji', () => {
        // '🎉' is a single codepoint encoded as 4 UTF-8 bytes (F0 9F 8E 89).
        // Cutting at 2 bytes must drop the whole emoji rather than emit a
        // half-character.
        expect(truncateUtf8('🎉🎉', 6)).toBe('🎉');
    });
});

describe('truncateCodepoints', () => {
    it('returns the input unchanged when it fits in the codepoint budget', () => {
        expect(truncateCodepoints('hello', 100)).toBe('hello');
    });

    it('truncates to the requested codepoint count', () => {
        expect(truncateCodepoints('abcdef', 3)).toBe('abc');
    });

    it('does not split surrogate-pair codepoints', () => {
        // Three emoji = 3 codepoints (6 UTF-16 code units).
        // Slicing UTF-16 at 3 would split the second emoji; the helper must
        // keep whole codepoints.
        expect(truncateCodepoints('🎉🎉🎉', 2)).toBe('🎉🎉');
    });
});
