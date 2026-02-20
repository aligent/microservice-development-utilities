/**
 * Type declarations for `@adobe/aio-lib-db` since there are no official types available yet.
 *
 * Note that only the types required in this library are defined to limit the scope and maintenance that we need to do
 * before the official types are available.
 *
 * Adobe App Builder Database Storage (Early Access)
 * @see https://developer.adobe.com/app-builder/docs/guides/app_builder_guides/storage/database
 *
 * These types leverage MongoDB driver types since Adobe I/O Database is built on AWS DocumentDB with MongoDB
 * compatibility.
 *
 * @example
 * ```typescript
 * interface User {
 *   _id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * const db = await libDb.init();
 * const client = await db.connect();
 * const users = await client.collection<User>('users');
 *
 * // Type-safe operations
 * const user = await users.findOne({ _id: '123' }); // Returns User | null
 * await users.replaceOne({ _id: '456' }, { _id: '456', name: 'John', email: 'john@example.com' });
 * ```
 */

declare module '@adobe/aio-lib-db' {
    import { type Collection, type Document, type InferIdType } from 'mongodb';

    export function init(): Promise<DbClient>;

    export type { Collection, Document, InferIdType };

    export interface DbClient {
        /**
         * Connect to the database.
         * Reads connection credentials from the runtime context.
         */
        connect(): Promise<DbConnection>;
    }

    export interface DbConnection {
        /**
         * Get a typed collection by name.
         * Collections are created automatically if they don't exist.
         */
        collection<T extends Document = Document>(collectionName: string): Promise<Collection<T>>;
    }
}
