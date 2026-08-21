import { describe, expect, it, vi } from 'vitest';
import { S3Service } from '../s3/s3.js';
import { createMockService } from './testing.js';

class Base {
    inheritedMethod(): string {
        return 'inherited';
    }
}

class Example extends Base {
    private readonly secret = 'hidden';

    greet(name: string): string {
        return `hello ${name}`;
    }

    farewell(name: string): string {
        return `bye ${name}, ${this.secret}`;
    }
}

describe('createMockService', () => {
    it('returns the override and records calls on the caller-supplied spy', () => {
        const greet = vi.fn().mockReturnValue('hi');
        const mock = createMockService(Example, { greet });

        expect(mock.greet('todd')).toBe('hi');
        expect(greet).toHaveBeenCalledWith('todd');
        expect(mock.greet.mock.calls).toHaveLength(1);
    });

    it('throws naming the class and the method when an unmocked method is accessed', () => {
        const mock = createMockService(Example, { greet: vi.fn() });

        expect(() => mock.farewell).toThrow('Example.farewell was accessed but not mocked');
    });

    it('throws for an inherited method that was not overridden', () => {
        const mock = createMockService(Example, {});

        expect(() => mock.inheritedMethod).toThrow(
            'Example.inheritedMethod was accessed but not mocked'
        );
    });

    it('returns undefined for keys that are not methods on the class', () => {
        const mock = createMockService(Example, {}) as unknown as Record<string, unknown>;

        expect(mock.notAMethod).toBeUndefined();
        expect(mock.then).toBeUndefined();
    });

    it('is safe to await', async () => {
        const mock = createMockService(Example, { greet: vi.fn() });

        await expect(Promise.resolve(mock)).resolves.toBe(mock);
    });

    it('does not invoke a prototype getter during method discovery', () => {
        let invocations = 0;

        class WithGetter {
            get eager(): string {
                invocations++;
                return 'evaluated';
            }
        }

        createMockService(WithGetter, {});

        expect(invocations).toBe(0);
    });

    it('does not throw on constructor access', () => {
        const mock = createMockService(Example, {});

        expect(() => mock.constructor).not.toThrow();
    });

    it('reports the class methods and the overrides for `in` and Object.keys', () => {
        const mock = createMockService(Example, { greet: vi.fn() });

        expect('greet' in mock).toBe(true);
        expect('farewell' in mock).toBe(true);
        expect('inheritedMethod' in mock).toBe(true);
        expect('notAMethod' in mock).toBe(false);
        expect(Object.keys(mock).sort()).toEqual(['farewell', 'greet', 'inheritedMethod']);
        expect(Object.getOwnPropertyDescriptor(mock, 'notAMethod')).toBeUndefined();
    });

    it('falls back to a generic name when the prototype carries no constructor', () => {
        const prototype: { ping?: () => void } = Object.create(null) as object;
        prototype.ping = () => undefined;

        const mock = createMockService({ prototype }, {});

        expect(() => mock.ping).toThrow('Service.ping was accessed but not mocked');
    });

    it('is accepted where the real service type is required, with no cast at the call site', () => {
        const getJsonObject = vi.fn().mockResolvedValue({ id: 1 });
        const s3: S3Service = createMockService(S3Service, { getJsonObject });

        expect(s3).toBeDefined();
    });

    it('rejects an override key that is not on the class', () => {
        // @ts-expect-error `greeet` is not a method of `Example`
        createMockService(Example, { greeet: vi.fn() });
    });

    it('rejects an override whose shape does not match the real method', () => {
        // @ts-expect-error `greet` takes a string and returns a string
        createMockService(Example, { greet: (count: number) => count });
    });
});
