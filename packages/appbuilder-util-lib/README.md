# @aligent/appbuilder-util-lib

A utility library for persistent, high-performance key-value storage
using Adobe I/O State (for caching) and Adobe I/O File (for durability).

## Overview

This library provides a high-level abstraction for key-value storage using Adobe App Builder's runtime services. It combines:
- **Adobe I/O Lib State** — fast access and short-term caching
- **Adobe I/O Lib Files** — long-term durability and backup

### Why both State and Files?

Adobe I/O State enforces a **TTL (Time-To-Live)** on all entries, so cached data will eventually expire and be evicted. Files storage has no such expiration, making it suitable for persistent, long-lived data. By writing to Files for durability and using State as a fast-access cache, we get speed from State and persistence from Files.

### 1 MB State size limit

Adobe I/O State imposes a **maximum value size of 1 MB** per entry. This library works around the limit automatically:
- **On write (`put`)**: values exceeding 1 MB are stored in Files only; the State cache is skipped.
- **On read (`get`)**: if the value retrieved from Files exceeds 1 MB, it is returned directly without being cached in State.

Values within the 1 MB limit are stored in both layers so that subsequent reads are served from the faster State cache.

### How it works

- Data is retrieved quickly from State if present (cache hit)
- If not found in State (cache miss, e.g. due to TTL expiry), the library loads from Files, then re-populates the State cache
- On updates, the value is written to Files first for durability, then cached in State

## Installation
```
npm install @aligent/appbuilder-util-lib
```

## Usage
```js
import { PersistentState } from '@aligent/appbuilder-util-lib';

const key = 'testKey'

const value = 'testValue'
const putKey = await PersistentState.put(key, value)
console.log(putKey) // prints encoded key to base64

const getValue = await PersistentState.get(key)
console.log(getValue) // prints 'testValue'
```

## Build

```sh
npx nx build appbuilder-util-lib
```

## Testing

```sh
npx nx test appbuilder-util-lib
```
