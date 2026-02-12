[**@aligent/appbuilder-util-lib**](../modules.md)

***

[@aligent/appbuilder-util-lib](../modules.md) / [aio-persistent-state](../modules/aio-persistent-state.md) / PersistentState.put

# Function: PersistentState.put()

> **put**(`key`, `value`): `Promise`\<`string`\>

Stores a value by key, writing through to both Files and State.

1. Always writes to Files first to guarantee durability (no TTL).
2. If the value is within the 1 MB State limit, it is also written to
   State for fast subsequent reads.
3. Values exceeding 1 MB are stored in Files only; State is skipped
   because it cannot hold entries larger than 1 MB.

## Parameters

### key

`string`

The key under which to store the value.

### value

`string`

The string value to store.

## Returns

`Promise`\<`string`\>

The base64url-encoded key.

## Throws

If the encoded key exceeds the maximum size or a storage operation fails.

## Example

```ts
import { PersistentState } from '@aligent/appbuilder-util-lib';

const encodedKey = await PersistentState.put('myKey', 'myValue');
```
