/**
 * @module aio-persistent-state
 *
 * A two-tier key-value storage library for Adobe App Builder runtime that
 * combines Adobe I/O State and Adobe I/O Files to achieve both fast access
 * and long-term durability.
 *
 * **Why both State and Files?**
 * Adobe I/O State enforces a TTL (Time-To-Live) on all entries, meaning
 * cached data will expire and be evicted automatically. Files storage has
 * no such expiration, making it suitable for persistent, long-lived data.
 * By writing to Files for durability and using State as a fast-access cache,
 * we get the best of both: speed from State and persistence from Files.
 *
 * **1MB size limit:**
 * Adobe I/O State imposes a maximum value size of 1 MB per entry. Values
 * that exceed this limit are stored in Files only, bypassing the State
 * cache entirely. On read, such values are served directly from Files
 * without being cached in State.
 */
import { Core, File, State } from '@adobe/aio-sdk';
import base64url from 'base64url';

const logger = Core.Logger('aio-persistent-state', { level: 'info' });

let stateLibPromise: Promise<State.AdobeState> | undefined;
let filesLibPromise: Promise<File.Files> | undefined;

/**
 * Returns a lazily-initialised Adobe I/O State instance.
 * The promise is cached so the SDK is only initialised once per process.
 * If initialisation fails, the cache is cleared so the next call retries.
 *
 * @returns A promise that resolves to the Adobe I/O State instance.
 */
function getStateLib(): Promise<State.AdobeState> {
    stateLibPromise ??= State.init().catch(err => {
        stateLibPromise = undefined;
        throw err;
    });
    return stateLibPromise;
}

/**
 * Returns a lazily-initialised Adobe I/O Files instance.
 * The promise is cached so the SDK is only initialised once per process.
 * If initialisation fails, the cache is cleared so the next call retries.
 *
 * @returns A promise that resolves to the Adobe I/O Files instance.
 */
function getFilesLib(): Promise<File.Files> {
    filesLibPromise ??= File.init().catch(err => {
        filesLibPromise = undefined;
        throw err;
    });
    return filesLibPromise;
}

/** Maximum length (in characters) of a base64url-encoded key accepted by State. */
const MAX_KEY_SIZE = 1024;

/** Maximum value size (in bytes) accepted by Adobe I/O State (1 MB). */
const MAX_VALUE_SIZE = 1024 * 1024; // 1MB

/**
 * Encodes a key using base64url so it is safe for use in Adobe I/O State,
 * which requires keys to match the pattern `/^[a-zA-Z0-9-_.]{1,1024}$/`.
 *
 * @param key - The original key string.
 * @returns The base64url-encoded key.
 * @throws {Error} If the encoded key exceeds 1024 characters ({@link MAX_KEY_SIZE}).
 */
function encodeKey(key: string): string {
    const encodedKey = base64url.encode(key);
    if (encodedKey.length > MAX_KEY_SIZE) {
        throw new Error(`Encoded key exceeds maximum size of ${MAX_KEY_SIZE} characters`);
    }
    return encodedKey;
}

/**
 * Retrieves a value by key, using State as a cache layer in front of Files.
 *
 * 1. Attempts to read from State (fast, but subject to TTL expiry).
 * 2. On a cache miss, falls back to Files (persistent, no TTL).
 * 3. If the value from Files is within the 1 MB State limit, it is
 *    written back into State so subsequent reads are served from cache.
 *
 * @param key - The key to look up.
 * @returns The stored string value.
 * @throws {Error} If the encoded key exceeds the maximum size or both
 *   storage layers fail.
 */
export async function get(key: string): Promise<string> {
    try {
        const stateLib = await getStateLib();
        const encodedKey = encodeKey(key);

        // Try to retrieve from State cache (may be missing due to TTL expiry)
        const cache = await stateLib.get(encodedKey);
        if (cache?.value != null) {
            return cache.value;
        }

        // Fallback: read from Files (persistent, no TTL)
        const filesLib = await getFilesLib();
        const buffer = await filesLib.read(`${key}.json`);
        const value = buffer.toString();

        // Re-populate State cache if value is within the 1MB size limit
        if (Buffer.byteLength(value) <= MAX_VALUE_SIZE) {
            await stateLib.put(encodedKey, value);
        }
        return value;
    } catch (error) {
        logger.error(`Failed to get key: ${key}`, JSON.stringify(error, null, 2));
        throw error;
    }
}

/**
 * Stores a value by key, writing through to both Files and State.
 *
 * 1. Always writes to Files first to guarantee durability (no TTL).
 * 2. If the value is within the 1 MB State limit, it is also written to
 *    State for fast subsequent reads.
 * 3. Values exceeding 1 MB are stored in Files only; State is skipped
 *    because it cannot hold entries larger than 1 MB.
 *
 * @param key - The key under which to store the value.
 * @param value - The string value to store.
 * @returns The base64url-encoded key.
 * @throws {Error} If the encoded key exceeds the maximum size or a
 *   storage operation fails.
 */
export async function put(key: string, value: string): Promise<string> {
    try {
        const encodedKey = encodeKey(key);

        const filesLib = await getFilesLib();
        // Always write to Files first for durability (no TTL)
        await filesLib.write(`${key}.json`, value);

        // Values exceeding the 1MB State limit are stored in Files only
        if (Buffer.byteLength(value) > MAX_VALUE_SIZE) {
            logger.warn(
                `Value for key "${key}" exceeds ${MAX_VALUE_SIZE} bytes, storing in file only`
            );
            return encodedKey;
        }

        // Also cache in State for fast access (subject to TTL expiry)
        const stateLib = await getStateLib();
        return await stateLib.put(encodedKey, value);
    } catch (error) {
        logger.error(`Failed to put key: ${key}`, JSON.stringify(error, null, 2));
        throw error;
    }
}
