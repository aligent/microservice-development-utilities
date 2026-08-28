import { describe, expect, it } from 'vitest';
import { deepMerge } from './deep-merge';

describe('deepMerge', () => {
    it('returns the base unchanged when no overrides are given', () => {
        const base = { a: 1, b: { c: 2 } };

        expect(deepMerge(base)).toEqual(base);
    });

    it('replaces primitive fields', () => {
        expect(deepMerge({ a: 1, b: 2 }, { a: 5 })).toEqual({ a: 5, b: 2 });
    });

    it('recurses into nested plain objects instead of replacing them', () => {
        const base = {
            requestContext: { httpMethod: 'GET', path: '/', identity: { sourceIp: '127.0.0.1' } },
        };

        const result = deepMerge(base, { requestContext: { httpMethod: 'POST' } });

        expect(result).toEqual({
            requestContext: { httpMethod: 'POST', path: '/', identity: { sourceIp: '127.0.0.1' } },
        });
    });

    it('replaces arrays outright rather than merging them', () => {
        expect(deepMerge({ items: [1, 2, 3] }, { items: [9] })).toEqual({ items: [9] });
    });

    it('replaces a base object with null when the override is null', () => {
        expect(deepMerge<{ a: { b: number } | null }>({ a: { b: 1 } }, { a: null })).toEqual({
            a: null,
        });
    });
});
