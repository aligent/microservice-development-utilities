# ErrorThrowingClient TS2590 Fix

## TLDR

The mapped conditional type in `ErrorThrowingClient` caused TS2590 by expanding all ~70 API paths into a single union and then filtering it with `Extract`. The fix replaces the mapped type with explicit generic method signatures that defer evaluation to the call site, and reconstructs the success response type directly instead of filtering. This preserves per-path type narrowing, scales to any number of paths, and has zero runtime cost.

## The Problem

The original `ErrorThrowingClient` used a **mapped conditional type** that inferred method signatures:

```ts
type ErrorThrowingClient<Paths> = {
  [K in keyof Client<Paths>]: Client<Paths>[K] extends (...args: infer A) => Promise<infer R>
    ? (...args: A) => Promise<Extract<R, { error?: never }>>
    : Client<Paths>[K];
};
```

Two compounding issues:

1. **Generic erasure**: `extends (...args: infer A) => Promise<infer R>` collapses the generic type parameters on methods like `GET`. Instead of preserving `<Path, Init>`, TypeScript infers `A` and `R` as the **fully-expanded union across all ~70 paths**. This kills per-path narrowing — `data` becomes `T | undefined` instead of the specific endpoint's type.

2. **TS2590**: `Extract<R, { error?: never }>` then runs over that massive union. The combinatorial explosion of filtering ~70 `FetchResponse` variants exceeds TypeScript's internal complexity limit, producing "Expression produces a union type that is too complex to represent".

## The Fix

Two key changes in `@aligent/microservice-util-lib`'s `throwing-client.ts`:

### 1. Explicit generic method signatures instead of mapped type

```ts
type ThrowingClientMethod<Paths, Method, Media> = <
  Path extends PathsWithMethod<Paths, Method>,
  Init extends MaybeOptionalInit<Paths[Path], Method>,
>(
  url: Path,
  ...init: InitParam<Init>
) => Promise<SuccessOnlyResponse<Paths[Path][Method], Init, Media>>;
```

The `ErrorThrowingClient` interface then declares each method explicitly (`GET: ThrowingClientMethod<Paths, 'get', Media>`, etc.) rather than mapping over `Client`'s keys.

### 2. Reconstruct success type instead of Extract

```ts
type SuccessOnlyResponse<T, Options, Media> = {
  data: ParseAsResponse<Readable<SuccessResponse<ResponseObjectMap<T>, Media>>, Options>;
  error?: never;
  response: Response;
};
```

Instead of `Extract<FetchResponse<...>, { error?: never }>` (which filters a union), it **builds the success shape directly** from the component types (`SuccessResponse`, `ParseAsResponse`). No union to filter means no combinatorial explosion.

## Why It Works

- **Generics are preserved**: Each method is explicitly generic over `Path` and `Init`. TypeScript only evaluates the return type when you call `client.GET('/specific/path', ...)` with a concrete path — it never has to expand all paths at once.
- **Evaluation is deferred**: `Paths[Path][Method]` is only resolved at the call site, not at the type definition. The type system works with one path at a time, not ~70.
- **No `Extract` over unions**: `SuccessOnlyResponse` constructs the result type from primitives, sidestepping the union-wide filter entirely.

## Pros

- **Scales indefinitely** — adding more paths to the schema won't trigger TS2590 since the type never materialises the full union.
- **Better type narrowing** — `data` is now the specific endpoint's response type, not `T | undefined`.
- **IDE autocomplete works** — path parameter suggests only valid paths and narrows `Init` accordingly.
- **Zero runtime cost** — purely a type-level change; `asErrorThrowingClient` is still just `return client`.
- **Eliminates workarounds** — no more `as unknown as` casts or local `Ap21Client` type aliases needed.

## Cons

- **Duplication** — all 8 HTTP methods are declared explicitly in the interface rather than derived from `Client` via mapping. If `openapi-fetch` adds a method or changes a signature, the library must be updated manually.
- **Fragile coupling to `openapi-fetch` internals** — `SuccessOnlyResponse` reconstructs the success branch using `ParseAsResponse`, `SuccessResponse`, `ResponseObjectMap` from `openapi-fetch` / `openapi-typescript-helpers`. If those helpers change shape, the reconstruction breaks.
- **`InitParam` is replicated** — `openapi-fetch` doesn't export this helper, so it's duplicated in the library. It must stay in sync manually.

## Mitigations

### 1. Duplication of 8 HTTP methods

The explicit declarations can't be avoided (mapped types erase generics — that's the root cause), but drift can be **caught automatically** with a compile-time conformance test:

```ts
// throwing-client.typetest.ts
type AssertSupersetKeys<Sub extends string | number | symbol, Super extends Sub> = never;

// Fails to compile if Client has a key that ErrorThrowingClient doesn't
type _Check = AssertSupersetKeys<keyof Client<TestPaths>, keyof ErrorThrowingClient<TestPaths>>;
```

If `openapi-fetch` adds a method (e.g. `QUERY`), `yarn typecheck` fails rather than silently missing coverage.

### 2. Fragile coupling to `openapi-fetch` internals

- **Pin `openapi-fetch` to a minor range** (e.g. `~0.12.0`) in the util-lib so internal type changes don't slip in unnoticed via patch bumps.
- Add a **type equivalence test** that asserts `SuccessOnlyResponse` produces the same shape as the `Extract`-based approach for a **single-path schema** (where `Extract` doesn't explode). If upstream restructures `FetchResponse`, the test catches the mismatch:

```ts
// For a single-path schema, Extract works fine — use it as the reference
type Expected = Extract<
  FetchResponse<SinglePathSchema['/test']['get'], {}, MediaType>,
  { error?: never }
>;
type Actual = SuccessOnlyResponse<SinglePathSchema['/test']['get'], {}, MediaType>;

// Fails if the shapes diverge
type _ShapeCheck = [Expected] extends [Actual]
  ? [Actual] extends [Expected]
    ? true
    : never
  : never;
```

This gives a canary — the single-path `Extract` is cheap enough for TypeScript, and if it stops matching `SuccessOnlyResponse`, the internals have changed.

### 3. `InitParam` replication

- **Open a PR upstream** to export `InitParam` from `openapi-fetch`. It's a small, stable utility type with a reasonable case for exporting. This eliminates the duplication at the source.
- Until then, the same type equivalence test approach works: assert the local `InitParam<T>` extends the one inferred from `Client`'s method signatures for a known path, and vice versa.

## Implemented `createErrorThrowingClient` convenience wrapper

A new `createErrorThrowingClient<Paths, Media>(clientOptions?)` function wraps `createClient` + the `ErrorThrowingClient` cast into a single call. This mitigates the coupling cons:

- **Consumers no longer import `createClient` from `openapi-fetch` directly** — the library owns the `openapi-fetch` dependency, so if internals change, only the library needs updating rather than every consumer.
- **Reduces boilerplate** — one call instead of two (`createClient` + `asErrorThrowingClient`).
- **Middleware registration stays with the caller** — the returned client exposes `.use()`, so consumers retain full control over middleware ordering. The JSDoc warns that `retryMiddleware({ throwOnNotOk: true })` must be registered for the type guarantee to hold.
