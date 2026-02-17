# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/claude-code) when working with this repository. It serves as a development historian capturing important design decisions.

## Project Overview

**@aligent/aio-persistent-state** is a two-tier hybrid storage library for Adobe App Builder runtime that combines:
- **Fast tier**: Adobe I/O State (in-memory cache with TTL-based expiration)
- **Durable tier**: Adobe I/O Files or Database (permanent storage)

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  State (fast, TTL-based)  ←──cache──→  Files/Database (permanent)       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Read flow**: State first → fallback to Files/Database → self-heal (restore to State)
**Write flow**: Durable storage first → then cache in State

### Key Files

| File | Purpose |
|------|---------|
| `state-files.ts` | FileStorageClient: State + Files hybrid (string values, 1MB limit handling) |
| `state-database.ts` | DatabaseStorageClient: State + Database hybrid (generic typed objects) |
| `utils.ts` | Shared utilities (`encodeKey`, `defaultLogger`) |
| `constants.ts` | Shared constants (`DEFAULT_ONE_YEAR_TTL_SECONDS`, `MAX_KEY_SIZE`, `MAX_STATE_VALUE_SIZE`) |
| `index.ts` | Barrel exports |
| `tests/state-files.test.ts` | Tests for FileStorageClient |
| `tests/state-database.test.ts` | Tests for DatabaseStorageClient |

## Common Commands

This module is part of the `@aligent/appbuilder-util-lib` package in a monorepo. Run commands from the repository root:

```bash
nx build appbuilder-util-lib      # Compile TypeScript
nx test appbuilder-util-lib       # Run tests
nx lint appbuilder-util-lib       # Run ESLint
```

## Design Decisions

This section documents key architectural and API decisions made during development.

### Return Types: `undefined` over `null` or throwing
**Decision**: `get()` returns `T | undefined` instead of `null` or throwing when data is not found.
**Rationale**: "Not found" is an expected state, not an error. Throwing would require try/catch for normal control flow. We use `undefined` over `null` because `undefined` semantically means "value was never set" or "absence of value", which matches the "not found" case. `null` typically means "value was explicitly set to nothing". Actual errors (connection failures, etc.) are still thrown.

### Error Handling Pattern
**Decision**: Catch errors, log them, then re-throw. Return `undefined` only for "not found".
**Rationale**: Callers should handle storage errors explicitly. Silent failures (swallowing errors) hide real problems. The pattern is:
```typescript
try {
  // operation
} catch (error) {
  if (isNotFoundError(error)) return undefined;
  logger.error('message', error);
  throw error;
}
```

### String Type for FileStorageClient
**Decision**: `FileStorageClient` uses `string` type, not generics.
**Rationale**: Adobe I/O Files returns Buffer/string. Users can `JSON.stringify`/`JSON.parse` themselves. This avoids hidden serialization behavior and gives users control.

### Generic Type for DatabaseStorageClient
**Decision**: `DatabaseStorageClient<T>` uses generics.
**Rationale**: Database stores structured documents. TypeScript generics provide type safety for the stored data shape without runtime overhead.

### Key Encoding with base64url
**Decision**: Encode all keys using base64url before passing to Adobe I/O State.
**Rationale**: Adobe I/O State requires keys to match `/^[a-zA-Z0-9-_.]{1,1024}$/`. Base64url encoding ensures any user-provided key is safe. Validation throws if encoded key exceeds 1024 chars.

### 1MB State Value Size Limit
**Decision**: Values exceeding 1MB bypass State and are stored in durable storage only.
**Rationale**: Adobe I/O State has a 1MB limit per entry. Rather than throwing an error, we gracefully degrade to durable-storage-only mode with a warning log. On read, large values from durable storage are returned without being cached in State.

### Database Backend (AWS DocumentDB)
**Decision**: Adobe I/O Database uses AWS DocumentDB (MongoDB-compatible), requiring data to be stored as documents.
**Rationale**: Data must be stored as documents (objects with `_id`), not raw primitives like strings. The `@adobe/aio-lib-db` API mirrors the MongoDB Node Driver. Plain strings cannot be stored directly—they must be wrapped in a document structure.

### JSON Serialization in DatabaseStorageClient
**Decision**: Data is serialized to JSON for State storage but stored as a native document in Database.
**Rationale**: State only accepts string values, while Database accepts documents. The storage format differs:

| Operation | State | Database |
|-----------|-------|----------|
| `put(data)` | `JSON.stringify(data)` → stored as string | `{ _id, ...data }` → stored as native document |
| `get()` | `JSON.parse(value)` → returned as object | Remove `_id` → returned as object |

This approach keeps both storage systems in sync while using each one's native format. Since `put()` receives a typed object (`T extends Document`), `JSON.stringify()` always produces valid JSON—no validation is needed before saving. The trade-off is that data must be JSON-serializable (no `Date` objects, `Map`, `Set`, `BigInt`, circular references, etc. without custom handling).

## Adobe I/O Constraints (as of February 2025)

> **Note**: These constraints were accurate at the time of writing. Adobe may update these limits. When making changes to this library, verify against the current documentation:
> - [Adobe I/O State](https://developer.adobe.com/app-builder/docs/guides/app_builder_guides/storage/)
> - [Adobe I/O Files](https://developer.adobe.com/app-builder/docs/guides/app_builder_guides/storage/)
> - [Adobe I/O Database](https://developer.adobe.com/app-builder/docs/guides/app_builder_guides/storage/database)

- **State TTL**: Maximum 1 year (31,536,000 seconds)
- **State Key**: Must match `/^[a-zA-Z0-9-_.]{1,1024}$/` (hence base64url encoding)
- **State Value Size**: Maximum 1 MB per entry
- **Database**: Early access feature, requires `@adobe/aio-lib-db`
