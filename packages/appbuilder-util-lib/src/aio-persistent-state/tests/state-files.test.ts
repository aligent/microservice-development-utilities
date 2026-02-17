import base64url from 'base64url';

jest.mock('@adobe/aio-lib-core-logging', () => () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

const mockFilesDelete = jest.fn();
const mockFilesRead = jest.fn();
const mockFilesWrite = jest.fn();

jest.mock('@adobe/aio-lib-files', () => ({
    init: jest.fn().mockResolvedValue({
        delete: mockFilesDelete,
        read: mockFilesRead,
        write: mockFilesWrite,
    }),
}));

const mockStateDelete = jest.fn();
const mockStateGet = jest.fn();
const mockStatePut = jest.fn();

jest.mock('@adobe/aio-lib-state', () => ({
    init: jest.fn().mockResolvedValue({
        delete: mockStateDelete,
        get: mockStateGet,
        put: mockStatePut,
    }),
}));

import { DEFAULT_ONE_YEAR_TTL_SECONDS } from '../src/constants';
import { createFileStorageClient } from '../src/state-files';

describe('createFileStorageClient()', () => {
    test('should throw when encoded key exceeds maximum size', async () => {
        const key = 'a'.repeat(1024);

        expect(() => createFileStorageClient({ key })).toThrow(
            'Encoded key exceeds maximum size of 1024 characters'
        );
    });
});

describe('get()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFilesRead.mockResolvedValue(Buffer.from('mocked-files-value'));
    });

    test('should retrieve value from state when key exists', async () => {
        const key = 'testKey';
        const client = createFileStorageClient({ key: 'testKey' });

        mockStateGet.mockResolvedValue({ value: 'mocked-state-value' });
        const result = await client.get();
        expect(result).toBe('mocked-state-value');

        expect(mockStateGet).toHaveBeenCalledWith(base64url.encode(key));
        expect(mockFilesRead).not.toHaveBeenCalled();
    });

    test('should retrieve empty string from state without falling back to files', async () => {
        const client = createFileStorageClient({ key: 'testKey' });

        mockStateGet.mockResolvedValue({ value: '' });
        const result = await client.get();

        expect(result).toBe('');
        expect(mockFilesRead).not.toHaveBeenCalled();
    });

    test('should fall back to files and cache in state when key is not in state', async () => {
        const key = 'testKey';
        const client = createFileStorageClient({ key: 'testKey' });

        mockStateGet.mockResolvedValue(null);
        const result = await client.get();

        expect(result).toBe('mocked-files-value');
        expect(mockFilesRead).toHaveBeenCalledWith(`${key}.json`);
        expect(mockStatePut).toHaveBeenCalledWith(base64url.encode(key), result, {
            ttl: DEFAULT_ONE_YEAR_TTL_SECONDS,
        });
    });

    test('should throw when state.get fails', async () => {
        const key = 'testKey';
        const client = createFileStorageClient({ key });

        const testError = new Error('State get failed');
        mockStateGet.mockRejectedValue(testError);

        await expect(client.get()).rejects.toThrow('State get failed');
        expect(mockStateGet).toHaveBeenCalledWith(base64url.encode(key));
    });

    test('should return value from files but skip caching when it exceeds maximum size', async () => {
        const largeValue = 'x'.repeat(1024 * 1024 + 1); // 1MB + 1 byte
        mockFilesRead.mockResolvedValue(Buffer.from(largeValue));
        mockStateGet.mockResolvedValue(null);

        const key = 'testKey';
        const client = createFileStorageClient({ key });
        const result = await client.get();

        expect(result).toBe(largeValue);
        expect(mockStatePut).not.toHaveBeenCalled();
    });
});

describe('put()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should encode the key, write to file, and put to state', async () => {
        const key = 'testKey';
        const value = 'testValue';
        const encodedKey = base64url.encode(key);
        const client = createFileStorageClient({
            key: 'testKey',
        });

        await client.put(value);

        expect(mockFilesWrite).toHaveBeenCalledWith(`${key}.json`, value);
        expect(mockStatePut).toHaveBeenCalledWith(encodedKey, value, {
            ttl: DEFAULT_ONE_YEAR_TTL_SECONDS,
        });
    });

    test('should throw when state.put fails', async () => {
        const testError = new Error('State put failed');
        mockStatePut.mockRejectedValue(testError);

        const key = 'testKey';
        const value = 'testValue';
        const client = createFileStorageClient({ key });

        await expect(client.put(value)).rejects.toThrow('State put failed');
        expect(mockStatePut).toHaveBeenCalledWith(base64url.encode(key), value, {
            ttl: DEFAULT_ONE_YEAR_TTL_SECONDS,
        });

        mockStatePut.mockReset();
    });

    test('should write to file only and skip state when value exceeds maximum size', async () => {
        const key = 'testKey';
        const largeValue = 'x'.repeat(1024 * 1024 + 1); // 1MB + 1 byte
        const client = createFileStorageClient({ key });

        await client.put(largeValue);

        expect(mockFilesWrite).toHaveBeenCalledWith(`${key}.json`, largeValue);
        expect(mockStatePut).not.toHaveBeenCalled();
    });
});

describe('exists()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return `true` when value exists in State', async () => {
        mockStateGet.mockResolvedValue({
            value: 'test-secret-value-that-shouldnt-be-returned',
        });

        const key = 'testKey';
        const client = createFileStorageClient({ key });

        const result = await client.exists();
        expect(result).toBe(true);
    });

    test("should return `true` when value doesn't exist in State, but exists in Files", async () => {
        mockStateGet.mockResolvedValue(null);
        mockFilesRead.mockResolvedValue(Buffer.from('secret-value-that-shouldnt-be-returned'));

        const key = 'testKey';
        const client = createFileStorageClient({ key });

        const result = await client.exists();
        expect(result).toBe(true);
    });

    test("should return `false` when value doesn't exist in either State, nor Files", async () => {
        mockStateGet.mockResolvedValue(null);
        mockFilesRead.mockResolvedValue(Buffer.from(''));

        const key = 'testKey';
        const client = createFileStorageClient({ key });

        const result = await client.exists();
        expect(result).toBe(false);
    });
});

describe('delete()', () => {
    test('should delete value from both State and Files', async () => {
        const key = 'testKey';
        const client = createFileStorageClient({ key });
        await client.delete();

        expect(mockStateDelete).toHaveBeenCalledTimes(1);
        expect(mockStateDelete).toHaveBeenCalledWith(base64url.encode(key));

        expect(mockFilesDelete).toHaveBeenCalledTimes(1);
        expect(mockFilesDelete).toHaveBeenCalledWith(`${key}.json`);
    });
});
