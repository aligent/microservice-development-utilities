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
import AioLogger from '@adobe/aio-lib-core-logging';
import { type Files, init as initialiseFiles } from '@adobe/aio-lib-files';
import { type AdobeState, init as initialiseState } from '@adobe/aio-lib-state';

import { DEFAULT_ONE_YEAR_TTL_SECONDS, MAX_STATE_VALUE_SIZE } from './constants';
import { defaultLogger, encodeKey } from './utils';

let stateLibPromise: Promise<AdobeState> | undefined;
let filesLibPromise: Promise<Files> | undefined;

/**
 * Returns a lazily-initialised Adobe I/O State instance.
 * The promise is cached so the SDK is only initialised once per process.
 * If initialisation fails, the cache is cleared so the next call retries.
 *
 * @returns A promise that resolves to the Adobe I/O State instance.
 */
function getStateLib(): Promise<AdobeState> {
    stateLibPromise ??= initialiseState().catch(err => {
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
function getFilesLib(): Promise<Files> {
    filesLibPromise ??= initialiseFiles().catch(err => {
        filesLibPromise = undefined;
        throw err;
    });
    return filesLibPromise;
}

/**
 * Configuration options for creating a file storage client.
 */
export interface FileStorageClientConfig {
    /** Key used to identify this data in State and Files storage */
    key: string;

    /** TTL (time-to-live) for State storage in seconds. Default: 31536000 (1 year) */
    ttl?: number;
}

/**
 * Interface for a hybrid State + Files storage client.
 */
export interface FileStorageClient {
    /**
     * Stores a value, writing through to both State and Files.
     * Values exceeding 1MB are stored in Files only.
     */
    put(value: string, logger?: ReturnType<typeof AioLogger>): Promise<void>;

    /**
     * Retrieves a value, using State as a cache layer in front of Files.
     * Values exceeding 1MB are stored and retrieved from Files only.
     */
    get(logger?: ReturnType<typeof AioLogger>): Promise<string | undefined>;

    /**
     * Check if data exists without returning it.
     */
    exists(logger?: ReturnType<typeof AioLogger>): Promise<boolean>;

    /**
     * Delete data from both State and Files.
     */
    delete(logger?: ReturnType<typeof AioLogger>): Promise<void>;

    /** The configuration used to create this client */
    readonly config: Readonly<Required<FileStorageClientConfig>>;
}

/**
 * Create a hybrid storage client that uses State as a cache and Files as durable storage.
 *
 * Each client manages ONE key. Calling `put()` will overwrite any existing data.
 * For storing multiple items, create separate clients with different `key` values.
 *
 * All clients share the same underlying Adobe I/O State and Files instances - they are
 * lightweight wrappers that provide typed access to specific keys.
 *
 * @example
 * ```typescript
 * const configClient = createFileStorageClient({ key: 'app-config' });
 *
 * // Store a JSON string
 * await configClient.put(JSON.stringify({ theme: 'dark' }));
 *
 * // Retrieve the value
 * const config = await configClient.get();
 * if (config) {
 *   console.log(JSON.parse(config)); // { theme: 'dark' }
 * }
 *
 * // Check existence and delete
 * if (await configClient.exists()) {
 *   await configClient.delete();
 * }
 * ```
 */
export function createFileStorageClient(config: FileStorageClientConfig): FileStorageClient {
    const fullConfig: Required<FileStorageClientConfig> = {
        ttl: DEFAULT_ONE_YEAR_TTL_SECONDS,
        ...config,
    };

    const encodedKey = encodeKey(fullConfig.key);
    const filePath = `${fullConfig.key}.json`;

    return {
        config: fullConfig,

        /**
         * Retrieves a value by key, using State as a cache layer in front of Files.
         *
         * 1. Attempts to read from State (fast, but subject to TTL expiry).
         * 2. On a cache miss, falls back to Files (persistent, no TTL).
         * 3. If the value from Files is within the 1 MB State limit, it is
         *    written back into State so subsequent reads are served from cache.
         *
         * @returns The stored string value, or `undefined` if not found.
         * @throws {Error} If a storage operation fails (other than "not found").
         */
        async get(logger?: ReturnType<typeof AioLogger>): Promise<string | undefined> {
            try {
                const stateLib = await getStateLib();

                // Try to retrieve from State cache (may be missing due to TTL expiry)
                const cache = await stateLib.get(encodedKey);

                if (cache?.value !== undefined) {
                    (logger ?? defaultLogger).debug(
                        `Data retrieved from State (key: ${fullConfig.key})`
                    );
                    return cache.value;
                }

                // Fallback: read from Files (persistent, no TTL)
                (logger ?? defaultLogger).debug('State miss - trying Files fallback');

                const filesLib = await getFilesLib();
                const buffer = await filesLib.read(filePath);
                const value = buffer.toString();

                // Re-populate State cache if value is within the 1MB size limit
                if (Buffer.byteLength(value) <= MAX_STATE_VALUE_SIZE) {
                    await stateLib.put(encodedKey, value, { ttl: fullConfig.ttl });

                    // Self-healing: restore to State
                    (logger ?? defaultLogger).debug(
                        'Data restored from Files to State (self-healing)'
                    );
                }
                return value;
            } catch (error) {
                (logger ?? defaultLogger).error(
                    `Failed to get key: ${fullConfig.key}`,
                    JSON.stringify(error, null, 2)
                );

                // Return `undefined` when data is not found and throw other errors
                if (
                    error instanceof Error &&
                    'code' in error &&
                    error.code === 'ERROR_FILE_NOT_EXISTS'
                ) {
                    return undefined;
                }

                throw error;
            }
        },

        /**
         * Stores a value by key, writing through to both Files and State.
         *
         * 1. Always writes to Files first to guarantee durability (no TTL).
         * 2. If the value is within the 1 MB State limit, it is also written to
         *    State for fast subsequent reads.
         * 3. Values exceeding 1 MB are stored in Files only; State is skipped
         *    because it cannot hold entries larger than 1 MB.
         *
         * @param value - The string value to store.
         * @throws {Error} If the encoded key exceeds the maximum size or a
         *   storage operation fails.
         */
        async put(value: string, logger?: ReturnType<typeof AioLogger>): Promise<void> {
            try {
                const filesLib = await getFilesLib();
                // Always write to Files first for durability (no TTL)
                await filesLib.write(filePath, value);

                (logger ?? defaultLogger).debug(`Data saved to File (file path: ${filePath})`);

                // Values exceeding the 1MB State limit are stored in Files only
                if (Buffer.byteLength(value) > MAX_STATE_VALUE_SIZE) {
                    (logger ?? defaultLogger).warn(
                        `Value for key "${fullConfig.key}" exceeds ${MAX_STATE_VALUE_SIZE} bytes, storing in file only`
                    );
                    return;
                }

                // Also cache in State for fast access (subject to TTL expiry)
                const stateLib = await getStateLib();
                await stateLib.put(encodedKey, value, {
                    ttl: fullConfig.ttl,
                });
                (logger ?? defaultLogger).debug(`Data saved to State (key: ${fullConfig.key})`);

                return;
            } catch (error) {
                (logger ?? defaultLogger).error(
                    `Failed to put key: ${fullConfig.key}`,
                    JSON.stringify(error, null, 2)
                );
                throw error;
            }
        },

        /**
         * Check if data exists without returning it.
         */
        async exists(logger?: ReturnType<typeof AioLogger>): Promise<boolean> {
            const value = await this.get(logger);
            return !!value;
        },

        /**
         * Delete data from both State and Files.
         */
        async delete(logger?: ReturnType<typeof AioLogger>): Promise<void> {
            try {
                const [stateLib, filesLib] = await Promise.all([getStateLib(), getFilesLib()]);

                await Promise.all([stateLib.delete(encodedKey), filesLib.delete(filePath)]);

                (logger ?? defaultLogger).debug(
                    `Data deleted from State (key: ${fullConfig.key}) and File`
                );
            } catch (error) {
                (logger ?? defaultLogger).error(
                    `Failed to delete key: ${fullConfig.key}`,
                    JSON.stringify(error, null, 2)
                );
                throw error;
            }
        },
    };
}
