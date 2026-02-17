[**@aligent/appbuilder-util-lib**](../modules.md)

***

[@aligent/appbuilder-util-lib](../modules.md) / [aio-persistent-state](../modules/aio-persistent-state.md) / createDatabaseStorageClient

# Function: createDatabaseStorageClient()

> **createDatabaseStorageClient**\<`T`\>(`config`): `DatabaseStorageClient<T>`

Creates a hybrid State + Database storage client for typed JSON objects.

Each client manages ONE document identified by `dbDocumentId`. Calling `put()` will overwrite any existing data. For storing multiple items, create separate clients with different `key` and `dbDocumentId` values.

All clients share the same underlying Adobe I/O State and Database instances — they are lightweight wrappers that provide typed access to specific documents.

## Type Parameters

### T

`T extends Document`

The type of data to store. Must be JSON-serializable.

## Parameters

### config

`DatabaseStorageClientConfig<T>`

Configuration options for the client.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `key` | `string` | Yes | Key for State cache |
| `dbCollection` | `string` | Yes | Database collection name |
| `dbDocumentId` | `string` | Yes | Document ID in the collection |
| `ttl` | `number` | No | State cache TTL in seconds (default: 31,536,000 = 1 year) |

## Returns

`DatabaseStorageClient<T>`

A client object with `put`, `get`, `exists`, and `delete` methods.

### Methods

#### `put(data, logger?): Promise<void>`

Stores a typed object. Data is JSON-serialized for State and stored as a native document in Database.

#### `get(logger?): Promise<T | undefined>`

Retrieves the stored object. Returns `undefined` if not found.

#### `exists(logger?): Promise<boolean>`

Checks if data exists without returning it.

#### `delete(logger?): Promise<void>`

Deletes data from both State and Database.

## Example

```typescript
import { createDatabaseStorageClient } from '@aligent/appbuilder-util-lib';

// Define your data type
interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
}

const prefsClient = createDatabaseStorageClient<UserPreferences>({
  key: 'user-prefs',
  dbCollection: 'preferences',
  dbDocumentId: 'user-123',
  ttl: 86400, // Optional: 1 day TTL
});

// Store typed data
await prefsClient.put({
  theme: 'dark',
  notifications: true,
  language: 'en',
});

// Retrieve typed data (returns UserPreferences | undefined)
const prefs = await prefsClient.get();
if (prefs) {
  console.log(prefs.theme); // TypeScript knows this is 'light' | 'dark'
}

// Check existence
if (await prefsClient.exists()) {
  console.log('Preferences exist');
}

// Delete data
await prefsClient.delete();
```

## Behaviour

### Storage format

Data is stored differently in each tier:

| Operation | State | Database |
|-----------|-------|----------|
| `put(data)` | `JSON.stringify(data)` → stored as string | `{ _id, ...data }` → stored as native document |
| `get()` | `JSON.parse(value)` → returned as object | Remove `_id` → returned as object |

### 1 MB State size limit

Values exceeding 1 MB (when JSON-serialized) are stored in Database only. On read, such values are returned without being cached in State.

### Read flow

1. Try State first (fast, but subject to TTL expiry)
2. On cache miss, fall back to Database (persistent, no TTL)
3. Self-heal: restore data to State for future reads (if within 1 MB limit)

### Write flow

1. Write to Database first (durability)
2. Cache in State (if within 1 MB limit)

## Notes

- Data must be JSON-serializable (no `Date` objects, `Map`, `Set`, `BigInt`, or circular references without custom handling)
- Adobe I/O Database uses AWS DocumentDB (MongoDB-compatible) under the hood
- The `_id` field is automatically managed; do not include it in your data type
