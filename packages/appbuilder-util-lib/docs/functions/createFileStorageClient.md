[**@aligent/appbuilder-util-lib**](../modules.md)

***

[@aligent/appbuilder-util-lib](../modules.md) / [aio-persistent-state](../modules/aio-persistent-state.md) / createFileStorageClient

# Function: createFileStorageClient()

> **createFileStorageClient**(`config`): `FileStorageClient`

Creates a hybrid State + Files storage client for string data.

Each client manages ONE key. Calling `put()` will overwrite any existing data. For storing multiple items, create separate clients with different `key` values.

All clients share the same underlying Adobe I/O State and Files instances — they are lightweight wrappers that provide typed access to specific keys.

## Parameters

### config

`FileStorageClientConfig`

Configuration options for the client.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `key` | `string` | Yes | Unique identifier for the data in State and Files storage |
| `ttl` | `number` | No | State cache TTL in seconds (default: 31,536,000 = 1 year) |

## Returns

`FileStorageClient`

A client object with `put`, `get`, `exists`, and `delete` methods.

### Methods

#### `put(value, logger?): Promise<void>`

Stores a string value. Values exceeding 1 MB are stored in Files only (State is skipped).

#### `get(logger?): Promise<string | undefined>`

Retrieves the stored value. Returns `undefined` if not found.

#### `exists(logger?): Promise<boolean>`

Checks if data exists without returning it.

#### `delete(logger?): Promise<void>`

Deletes data from both State and Files.

## Example

```typescript
import { createFileStorageClient } from '@aligent/appbuilder-util-lib';

const configClient = createFileStorageClient({
  key: 'app-config',
  ttl: 86400, // Optional: 1 day TTL
});

// Store a JSON string
await configClient.put(JSON.stringify({ theme: 'dark', locale: 'en' }));

// Retrieve the value (returns string | undefined)
const config = await configClient.get();
if (config) {
  console.log(JSON.parse(config)); // { theme: 'dark', locale: 'en' }
}

// Check existence
if (await configClient.exists()) {
  console.log('Config exists');
}

// Delete data
await configClient.delete();
```

## Behaviour

### 1 MB State size limit

Adobe I/O State imposes a maximum value size of 1 MB per entry. This client handles it automatically:

- **On write (`put`)**: Values exceeding 1 MB are stored in Files only; State is skipped with a warning log.
- **On read (`get`)**: If the value from Files exceeds 1 MB, it is returned directly without being cached in State.

Values within the 1 MB limit are stored in both layers so that subsequent reads are served from the faster State cache.

### Read flow

1. Try State first (fast, but subject to TTL expiry)
2. On cache miss, fall back to Files (persistent, no TTL)
3. Self-heal: restore data to State for future reads (if within 1 MB limit)

### Write flow

1. Write to Files first (durability)
2. Cache in State (if within 1 MB limit)
