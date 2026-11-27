import { describe, expect, it } from 'vitest';
import * as entryPoint from '../index.js';
import { parseJson } from './json';

describe('parseJson', () => {
    it('returns the parsed value', () => {
        expect(parseJson<{ a: number }>('{"a":1}', 'ctx')).toEqual({ a: 1 });
    });

    it('throws an error that names the context and carries no input text', () => {
        const input = '{"password": hunter2}';

        const error = (() => {
            try {
                return parseJson(input, "Secret 'db'");
            } catch (e) {
                return e;
            }
        })();

        expect(error).toBeInstanceOf(Error);
        const { message, cause } = error as Error;
        expect(message).toBe("Secret 'db' does not contain valid JSON");
        expect(cause).toBeUndefined();
    });

    it('is internal and not exported from the package entry point', () => {
        expect(entryPoint).not.toHaveProperty('parseJson');
    });
});
