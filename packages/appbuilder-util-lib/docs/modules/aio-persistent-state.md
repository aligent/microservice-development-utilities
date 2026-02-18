[**@aligent/appbuilder-util-lib**](../modules.md)

***

[@aligent/appbuilder-util-lib](../modules.md) / aio-persistent-state

# Module: aio-persistent-state

A utility library for persistent, high-performance key-value storage in Adobe App Builder runtime. Provides two hybrid storage clients:

- **State + Files** — for string data up to 1 MB with automatic overflow handling
- **State + Database** — for typed JSON objects with MongoDB-like storage

## Overview

This library provides high-level abstractions for key-value storage using Adobe App Builder's runtime services. Both clients use a two-tier architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  State (fast, TTL-based)  ←──cache──→  Files/Database (permanent)       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why two tiers?

Adobe I/O State enforces a **TTL (Time-To-Live)** on all entries, so cached data will eventually expire. Files and Database storage have no such expiration, making them suitable for persistent data. By combining both, we get speed from State and persistence from the durable tier.

### Storage options

| Feature        | State + Files             | State + Database                |
|----------------|---------------------------|---------------------------------|
| Data type      | `string`                  | Generic `T` (JSON-serializable) |
| Max value size | Unlimited (1 MB cached)   | Limited by Database             |
| Query support  | Key-based only            | MongoDB-like queries            |
| Best for       | Large strings, JSON blobs | Structured typed data           |

## Interfaces

- [FileStorageClientConfig](../interfaces/FileStorageClientConfig.md)
- [FileStorageClient](../interfaces/FileStorageClient.md)
- [DatabaseStorageClientConfig](../interfaces/DatabaseStorageClientConfig.md)
- [DatabaseStorageClient](../interfaces/DatabaseStorageClient.md)

## Functions

- [createFileStorageClient](../functions/createFileStorageClient.md)
- [createDatabaseStorageClient](../functions/createDatabaseStorageClient.md)

## Behaviour

### Read flow

1. Try State first (fast path)
2. On cache miss, fall back to Files/Database
3. Self-heal: restore data to State cache for future reads

### Write flow

- **Files client**: Write to Files first (durability), then cache in State
- **Database client**: Write to Database first, then cache in State

### Error handling

- `get()` returns `undefined` when data is not found
- All methods throw on actual storage errors (connection failures, etc.)
- Errors are logged before being re-thrown
