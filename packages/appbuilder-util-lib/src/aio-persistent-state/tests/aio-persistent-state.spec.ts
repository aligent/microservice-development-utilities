import base64url from 'base64url';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mockStateGet, mockStatePut, mockFilesRead, mockFilesWrite } = vi.hoisted(() => ({
    mockStateGet: vi.fn(),
    mockStatePut: vi.fn(),
    mockFilesRead: vi.fn(),
    mockFilesWrite: vi.fn(),
}));

vi.mock('@adobe/aio-sdk', () => ({
    Core: {
        Logger: () => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        }),
    },
    State: {
        init: vi.fn().mockResolvedValue({
            put: mockStatePut,
            get: mockStateGet,
        }),
    },
    File: {
        init: vi.fn().mockResolvedValue({
            read: mockFilesRead,
            write: mockFilesWrite,
        }),
    },
}));

import { get, put } from '../aio-persistent-state';

describe('get()', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFilesRead.mockResolvedValue(Buffer.from('mocked-files-value'));
    });

    test('should retrieve value from state when key exists', async () => {
        mockStateGet.mockResolvedValue({ value: 'mocked-state-value' });
        const key = 'testKey';
        const result = await get(key);
        expect(result).toBe('mocked-state-value');
        expect(mockStateGet).toHaveBeenCalledWith(base64url.encode(key));
        expect(mockFilesRead).not.toHaveBeenCalled();
    });

    test('should retrieve empty string from state without falling back to files', async () => {
        mockStateGet.mockResolvedValue({ value: '' });
        const key = 'testKey';
        const result = await get(key);
        expect(result).toBe('');
        expect(mockFilesRead).not.toHaveBeenCalled();
    });

    test('should fall back to files and cache in state when key is not in state', async () => {
        mockStateGet.mockResolvedValue(null);
        const key = 'testKey';
        const result = await get(key);
        expect(result).toBe('mocked-files-value');
        expect(mockStatePut).toHaveBeenCalledWith(base64url.encode(key), result);
    });

    test('should throw when state.get fails', async () => {
        const testError = new Error('State get failed');
        mockStateGet.mockRejectedValue(testError);

        const key = 'testKey';

        await expect(get(key)).rejects.toThrow('State get failed');
        expect(mockStateGet).toHaveBeenCalledWith(base64url.encode(key));
    });

    test('should throw when encoded key exceeds maximum size', async () => {
        const key = 'a'.repeat(1024);

        await expect(get(key)).rejects.toThrow(
            'Encoded key exceeds maximum size of 1024 characters'
        );
        expect(mockStateGet).not.toHaveBeenCalled();
    });

    test('should return value from files but skip caching when it exceeds maximum size', async () => {
        const largeValue = 'x'.repeat(1024 * 1024 + 1); // 1MB + 1 byte
        mockFilesRead.mockResolvedValue(Buffer.from(largeValue));
        mockStateGet.mockResolvedValue(null);

        const key = 'testKey';
        const result = await get(key);

        expect(result).toBe(largeValue);
        expect(mockStatePut).not.toHaveBeenCalled();
    });
});

describe('put()', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('should encode the key, write to file, and put to state', async () => {
        const key = 'testKey';
        const encodedKey = base64url.encode(key);
        const value = 'testValue';
        mockStatePut.mockResolvedValue(encodedKey);

        const result = await put(key, value);

        expect(result).toBe(encodedKey);
        expect(mockFilesWrite).toHaveBeenCalledWith(`${key}.json`, value);
        expect(mockStatePut).toHaveBeenCalledWith(encodedKey, value);
    });

    test('should throw when state.put fails', async () => {
        const testError = new Error('State put failed');
        mockStatePut.mockRejectedValue(testError);

        const key = 'testKey';
        const value = 'testValue';

        await expect(put(key, value)).rejects.toThrow('State put failed');
        expect(mockStatePut).toHaveBeenCalledWith(base64url.encode(key), value);
    });

    test('should throw when encoded key exceeds maximum size', async () => {
        const key = 'a'.repeat(1024);
        const value = 'testValue';

        await expect(put(key, value)).rejects.toThrow(
            'Encoded key exceeds maximum size of 1024 characters'
        );
        expect(mockStatePut).not.toHaveBeenCalled();
        expect(mockFilesWrite).not.toHaveBeenCalled();
    });

    test('should write to file only and skip state when value exceeds maximum size', async () => {
        const key = 'testKey';
        const encodedKey = base64url.encode(key);
        const largeValue = 'x'.repeat(1024 * 1024 + 1); // 1MB + 1 byte

        const result = await put(key, largeValue);

        expect(result).toBe(encodedKey);
        expect(mockFilesWrite).toHaveBeenCalledWith(`${key}.json`, largeValue);
        expect(mockStatePut).not.toHaveBeenCalled();
    });
});
