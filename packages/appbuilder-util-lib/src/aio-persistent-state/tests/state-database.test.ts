import base64url from 'base64url';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockDeleteOne, mockFindOne, mockReplaceOne, mockStateDelete, mockStateGet, mockStatePut } =
    vi.hoisted(() => ({
        mockDeleteOne: vi.fn(),
        mockFindOne: vi.fn(),
        mockReplaceOne: vi.fn(),
        mockStateDelete: vi.fn(),
        mockStateGet: vi.fn(),
        mockStatePut: vi.fn(),
    }));

vi.mock('@adobe/aio-lib-core-logging', () => ({
    default: () => ({
        info: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
    }),
}));

vi.mock('@adobe/aio-lib-db', () => ({
    init: () =>
        Promise.resolve({
            connect: () => ({
                collection: vi.fn().mockResolvedValue({
                    deleteOne: mockDeleteOne,
                    findOne: mockFindOne,
                    replaceOne: mockReplaceOne,
                }),
            }),
        }),
}));

vi.mock('@adobe/aio-lib-state', () => ({
    init: () =>
        Promise.resolve({
            delete: mockStateDelete,
            get: mockStateGet,
            put: mockStatePut,
        }),
}));

import { DEFAULT_ONE_YEAR_TTL_SECONDS } from '../constants';
import { createDatabaseStorageClient } from '../state-database';

describe('createDatabaseStorageClient()', () => {
    test('should throw when encoded key exceeds maximum size', async () => {
        const key = 'a'.repeat(1024);

        expect(() =>
            createDatabaseStorageClient({
                key,
                dbCollection: 'books',
                dbDocumentId: '123',
            })
        ).toThrow('Encoded key exceeds maximum size of 1024 characters');
    });
});

describe('get()', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFindOne.mockResolvedValue({
            _id: '123',
            'mocked-database-key': 'mocked-database-value',
        });
    });

    test('should retrieve value from state when key exists', async () => {
        const key = 'testKey';
        const client = createDatabaseStorageClient({
            key,
            dbCollection: 'books',
            dbDocumentId: '123',
        });

        mockStateGet.mockResolvedValue({
            value: '{ "mocked-state-key": "mocked-state-value" }',
        });

        const result = await client.get();
        expect(result).toMatchObject({
            ['mocked-state-key']: 'mocked-state-value',
        });

        expect(mockStateGet).toHaveBeenCalledWith(base64url.encode(key));
        expect(mockFindOne).not.toHaveBeenCalled();
    });

    test('should fall back to database and cache in state when key is not in state', async () => {
        const key = 'testKey';
        const client = createDatabaseStorageClient({
            key,
            dbCollection: 'books',
            dbDocumentId: '123',
        });

        mockStateGet.mockResolvedValue(undefined);
        const result = await client.get();

        expect(result).toMatchObject({
            'mocked-database-key': 'mocked-database-value',
        });
        expect(mockFindOne).toHaveBeenCalledWith({ _id: '123' }, { projection: { _id: 0 } });
        expect(mockStatePut).toHaveBeenCalledWith(base64url.encode(key), JSON.stringify(result), {
            ttl: DEFAULT_ONE_YEAR_TTL_SECONDS,
        });
    });

    test('should throw when state.get fails', async () => {
        const key = 'testKey';
        const client = createDatabaseStorageClient({
            key,
            dbCollection: 'books',
            dbDocumentId: '123',
        });

        const testError = new Error('State get failed');
        mockStateGet.mockRejectedValue(testError);

        await expect(client.get()).rejects.toThrow('State get failed');
        expect(mockStateGet).toHaveBeenCalledWith(base64url.encode(key));
    });

    test('should return value from database but skip caching when it exceeds maximum size', async () => {
        const largeValue = 'x'.repeat(1024 * 1024 + 1); // 1MB + 1 byte
        mockStateGet.mockResolvedValue(undefined);
        mockFindOne.mockResolvedValue({
            _id: '123',
            'mocked-database-key': largeValue,
        });

        const client = createDatabaseStorageClient({
            key: 'testKey',
            dbCollection: 'books',
            dbDocumentId: '123',
        });
        const result = await client.get();

        expect(result).toMatchObject({ 'mocked-database-key': largeValue });
        expect(mockStatePut).not.toHaveBeenCalled();
    });
});

describe('put()', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('should encode the key, write to file, and put to state', async () => {
        const key = 'testKey';
        const value = 'testValue';
        const encodedKey = base64url.encode(key);
        const client = createDatabaseStorageClient({
            key: 'testKey',
            dbCollection: 'books',
            dbDocumentId: '123',
        });

        await client.put({ value });

        expect(mockReplaceOne).toHaveBeenCalledWith(
            { _id: '123' },
            { _id: '123', value },
            { upsert: true }
        );
        expect(mockStatePut).toHaveBeenCalledWith(encodedKey, JSON.stringify({ value }), {
            ttl: DEFAULT_ONE_YEAR_TTL_SECONDS,
        });
    });

    test('should throw when state.put fails', async () => {
        const testError = new Error('State put failed');
        mockStatePut.mockRejectedValue(testError);

        const key = 'testKey';
        const value = 'testValue';
        const client = createDatabaseStorageClient({
            key: 'testKey',
            dbCollection: 'books',
            dbDocumentId: '123',
        });

        await expect(client.put({ value })).rejects.toThrow('State put failed');
        expect(mockStatePut).toHaveBeenCalledWith(
            base64url.encode(key),
            JSON.stringify({ value }),
            {
                ttl: DEFAULT_ONE_YEAR_TTL_SECONDS,
            }
        );

        mockStatePut.mockReset();
    });

    test('should write to file only and skip state when value exceeds maximum size', async () => {
        const largeValue = 'x'.repeat(1024 * 1024 + 1); // 1MB + 1 byte
        const client = createDatabaseStorageClient({
            key: 'testKey',
            dbCollection: 'books',
            dbDocumentId: '123',
        });

        await client.put({ value: largeValue });

        expect(mockReplaceOne).toHaveBeenCalledWith(
            { _id: '123' },
            { _id: '123', value: largeValue },
            { upsert: true }
        );
        expect(mockStatePut).not.toHaveBeenCalled();
    });
});

describe('exists()', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('should return `true` when value exists in State', async () => {
        mockStateGet.mockResolvedValue({
            value: '{ "mocked-state-key": "mocked-state-value" }',
        });

        const client = createDatabaseStorageClient({
            key: 'testKey',
            dbCollection: 'books',
            dbDocumentId: '123',
        });

        const result = await client.exists();
        expect(result).toBe(true);
    });

    test("should return `true` when value doesn't exist in State, but exists in Database", async () => {
        mockStateGet.mockResolvedValue(undefined);

        const client = createDatabaseStorageClient({
            key: 'testKey',
            dbCollection: 'books',
            dbDocumentId: '123',
        });

        const result = await client.exists();
        expect(result).toBe(true);
    });

    test("should return `false` when value doesn't exist in either State, nor Database", async () => {
        mockStateGet.mockResolvedValue(undefined);
        mockFindOne.mockResolvedValue(null);

        const client = createDatabaseStorageClient({
            key: 'testKey',
            dbCollection: 'books',
            dbDocumentId: '123',
        });

        const result = await client.exists();
        expect(result).toBe(false);
    });
});

describe('delete()', () => {
    test('should delete value from both State and Database', async () => {
        const key = 'testKey';
        const client = createDatabaseStorageClient({
            key: 'testKey',
            dbCollection: 'books',
            dbDocumentId: '123',
        });
        await client.delete();

        expect(mockStateDelete).toHaveBeenCalledTimes(1);
        expect(mockStateDelete).toHaveBeenCalledWith(base64url.encode(key));

        expect(mockDeleteOne).toHaveBeenCalledTimes(1);
        expect(mockDeleteOne).toHaveBeenCalledWith({ _id: '123' });
    });
});
