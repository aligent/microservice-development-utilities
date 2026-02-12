[**@aligent/appbuilder-util-lib**](../modules.md)

***

[@aligent/appbuilder-util-lib](../modules.md) / [aio-persistent-state](../modules/aio-persistent-state.md) / PersistentState.get

# Function: PersistentState.get()

> **get**(`key`): `Promise`\<`string`\>

Retrieves a value by key, using State as a cache layer in front of Files.

1. Attempts to read from State (fast, but subject to TTL expiry).
2. On a cache miss, falls back to Files (persistent, no TTL).
3. If the value from Files is within the 1 MB State limit, it is
   written back into State so subsequent reads are served from cache.

## Parameters

### key

`string`

The key to look up.

## Returns

`Promise`\<`string`\>

The stored string value.

## Throws

If the encoded key exceeds the maximum size or both storage layers fail.

## Example

```ts
import { PersistentState } from '@aligent/appbuilder-util-lib';

const value = await PersistentState.get('myKey');
```
