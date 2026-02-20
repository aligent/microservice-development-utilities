/**
 * @module aio-persistent-state/database
 *
 * A two-tier key-value storage library for Adobe App Builder runtime that
 * combines Adobe I/O State and Adobe I/O Database to achieve both fast access
 * and long-term durability.
 *
 * **Why both State and Database?**
 * Adobe I/O State enforces a TTL (Time-To-Live) on all entries, meaning
 * cached data will expire and be evicted automatically. Database storage has
 * no such expiration, making it suitable for persistent, long-lived data.
 * By writing to Database for durability and using State as a fast-access cache,
 * we get the best of both: speed from State and persistence from Database.
 *
 * **Architecture:**
 * ```
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  State (fast, TTL-based)  ←──cache──→  Database (permanent backup)      │
 * └─────────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * **Write flow:** Database first and then State if the value is within the State size limit (1MB).
 * **Read flow:** State first → Database fallback → self-heal (restore to State)
 *
 * @see https://developer.adobe.com/app-builder/docs/guides/app_builder_guides/storage/database
 */

import AioLogger from '@adobe/aio-lib-core-logging';
import {
    type DbClient,
    type Document,
    type InferIdType,
    init as initialiseDb,
} from '@adobe/aio-lib-db';
import { type AdobeState, init as initialiseState } from '@adobe/aio-lib-state';

import { DEFAULT_ONE_YEAR_TTL_SECONDS, MAX_STATE_VALUE_SIZE } from './constants';
import { defaultLogger, encodeKey } from './utils';

let stateLibPromise: Promise<AdobeState> | undefined;
let dbLibPromise: Promise<DbClient> | undefined;

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
 * Returns a lazily-initialised Adobe I/O Database instance.
 * The promise is cached so the SDK is only initialised once per process.
 * If initialisation fails, the cache is cleared so the next call retries.
 *
 * @returns A promise that resolves to the Adobe I/O Database instance.
 */
function getDbLib(): Promise<DbClient> {
    dbLibPromise ??= initialiseDb().catch(err => {
        dbLibPromise = undefined;
        throw err;
    });
    return dbLibPromise;
}

/**
 * Configuration options for creating a database storage client.
 */
export interface DatabaseStorageClientConfig<T> {
    /** Key used to store data in Adobe I/O State */
    key: string;

    /** Collection name in Adobe I/O Database */
    dbCollection: string;

    /** Document ID in the database collection */
    dbDocumentId: InferIdType<T & { _id: string }>; // Force the definition to infer `_id` as string

    /** TTL (time-to-live) for State storage in seconds. Default: 31536000 (1 year) */
    ttl?: number;
}

/**
 * Interface for a hybrid State + database storage client.
 */
export interface DatabaseStorageClient<T extends Document> {
    /**
     * Save data to both State and Database.
     * Values exceeding 1MB are stored in Database only.
     */
    put(data: T, logger?: ReturnType<typeof AioLogger>): Promise<void>;

    /**
     * Retrieve data using State-first, Database-fallback strategy.
     * Includes self-healing: restores to State if found in Database and if the value is within the 1MB size limit.
     * `undefined` is returned if no data is found.
     */
    get(logger?: ReturnType<typeof AioLogger>): Promise<T | undefined>;

    /**
     * Check if data exists without returning it.
     */
    exists(logger?: ReturnType<typeof AioLogger>): Promise<boolean>;

    /**
     * Delete data from both State and Database.
     */
    delete(logger?: ReturnType<typeof AioLogger>): Promise<void>;

    /** The configuration used to create this client */
    readonly config: Readonly<Required<DatabaseStorageClientConfig<T>>>;
}

/**
 * Create a hybrid storage client to manage a single document of a specific data type.
 *
 * Each client manages ONE document identified by `dbDocumentId`. Calling `put()`
 * will overwrite any existing data. For storing multiple items, create separate
 * clients with different `key` and `dbDocumentId` values.
 *
 * All clients share the same underlying Adobe I/O State and Database - they are
 * lightweight wrappers that provide typed access to specific documents.
 *
 * The client provides `put`, `get`, `exists`, and `delete` functions to manage data.
 *
 * @example
 * ```typescript
 * interface UserPreferences {
 *   theme: 'light' | 'dark';
 *   notifications: boolean;
 * }
 *
 * // Each client manages a single document in the shared storage
 * const prefsClient = createDatabaseStorageClient<UserPreferences>({
 *   key: 'user-prefs',
 *   dbCollection: 'preferences',
 *   dbDocumentId: 'user-prefs',  // Fixed document ID - only one document per client
 * });
 *
 * // Save preferences (overwrites any existing data)
 * await prefsClient.put({ theme: 'dark', notifications: true });
 *
 * // Retrieve preferences
 * const prefs = await prefsClient.get();
 * if (prefs) {
 *   console.log('Theme:', prefs.theme); // Output: "Theme: dark"
 * }
 * ```
 */
export function createDatabaseStorageClient<T extends Document>(
    config: DatabaseStorageClientConfig<T>
): DatabaseStorageClient<T> {
    const fullConfig: Required<DatabaseStorageClientConfig<T>> = {
        ttl: DEFAULT_ONE_YEAR_TTL_SECONDS,
        ...config,
    };

    const encodedKey = encodeKey(fullConfig.key);

    return {
        config: fullConfig,

        /**
         * Save data to both State (fast access) and Database (permanent backup). The data must be JSON-serializable.
         */
        async put(data: T, logger?: ReturnType<typeof AioLogger>): Promise<void> {
            try {
                const jsonData = JSON.stringify(data);

                // Initialize both State and Database clients in parallel
                const [state, db] = await Promise.all([getStateLib(), getDbLib()]);

                // Connect to database and get the collection
                const dbClient = await db.connect();
                const collection = await dbClient.collection(fullConfig.dbCollection);

                // Prepare the database document (flat structure with _id)
                const dbDocument = {
                    _id: fullConfig.dbDocumentId,
                    ...data,
                };

                await collection.replaceOne({ _id: fullConfig.dbDocumentId }, dbDocument, {
                    upsert: true,
                });
                (logger ?? defaultLogger).debug(`Data saved to Database (key: ${fullConfig.key})`);

                // Values exceeding the 1MB State limit are stored in Database only
                if (Buffer.byteLength(jsonData) > MAX_STATE_VALUE_SIZE) {
                    (logger ?? defaultLogger).warn(
                        `Value for key "${fullConfig.key}" exceeds ${MAX_STATE_VALUE_SIZE} bytes, storing in Database only`
                    );
                    return;
                }

                await state.put(encodedKey, jsonData, { ttl: fullConfig.ttl });
                (logger ?? defaultLogger).debug(`Data saved to State (key: ${fullConfig.key})`);
            } catch (error) {
                (logger ?? defaultLogger).error(
                    `Failed to put key: ${fullConfig.key}`,
                    JSON.stringify(error, null, 2)
                );
                throw error;
            }
        },

        /**
         * Retrieve data using State-first, Database-fallback strategy. If State has expired, data is restored
         * from Database automatically (self-healing). `undefined` is returned if no data is found in either State or
         * Database.
         */
        async get(logger?: ReturnType<typeof AioLogger>): Promise<T | undefined> {
            try {
                // Try State first (fast path)
                const state = await getStateLib();
                const stateResult = await state.get(encodedKey);

                if (stateResult?.value !== undefined) {
                    (logger ?? defaultLogger).debug(
                        `Data retrieved from State (key: ${fullConfig.key})`
                    );
                    return JSON.parse(stateResult.value);
                }

                // State miss - try Database fallback
                (logger ?? defaultLogger).debug('State miss - trying Database fallback');

                const db = await getDbLib();
                const dbClient = await db.connect();
                const collection = await dbClient.collection(fullConfig.dbCollection);

                const doc = await collection.findOne<T>(
                    {
                        _id: fullConfig.dbDocumentId,
                    },
                    { projection: { _id: 0 } } // Exclude _id from the result to get original data shape
                );

                // Return `undefined` when document not found (this is expected, not an error)
                if (doc === null) {
                    (logger ?? defaultLogger).debug('Data not found in State or Database');
                    return undefined;
                }

                // Re-populate State cache if value is within the 1MB size limit
                const jsonData = JSON.stringify(doc);
                if (Buffer.byteLength(jsonData) <= MAX_STATE_VALUE_SIZE) {
                    await state.put(encodedKey, jsonData, {
                        ttl: fullConfig.ttl,
                    });

                    // Self-healing: restore to State
                    (logger ?? defaultLogger).debug(
                        'Data restored from Database to State (self-healing)'
                    );
                }

                return doc;
            } catch (error) {
                (logger ?? defaultLogger).error(
                    `Failed to get key: ${fullConfig.key}`,
                    JSON.stringify(error, null, 2)
                );
                throw error;
            }
        },

        /**
         * Check if data exists without returning it.
         */
        async exists(logger?: ReturnType<typeof AioLogger>): Promise<boolean> {
            const data = await this.get(logger);
            return data !== undefined;
        },

        /**
         * Delete data from both State and Database.
         */
        async delete(logger?: ReturnType<typeof AioLogger>): Promise<void> {
            try {
                const [state, db] = await Promise.all([getStateLib(), getDbLib()]);

                const dbClient = await db.connect();
                const collection = await dbClient.collection(fullConfig.dbCollection);

                await Promise.all([
                    state.delete(encodedKey),
                    collection.deleteOne({ _id: fullConfig.dbDocumentId }),
                ]);

                (logger ?? defaultLogger).debug(
                    `Data deleted from State (key: ${fullConfig.key}) and Database`
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
