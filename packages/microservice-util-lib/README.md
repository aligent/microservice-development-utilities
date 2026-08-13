# Microservices Utilities Library

This library includes utility functions to simplify & standardise common
MicroServices tasks.

## Documentation

Documentation on each function can be found [here](docs/modules.md)

## Retries

Use `retryFetch` as the client's `fetch`. Retries then happen beneath the middleware chain, so every attempt's response flows through the full chain:

```ts
const client = createClient<paths>({
  baseUrl,
  fetch: retryFetch({ retries: 3, retryDelay: 'exponential' }),
});
client.use(throwOnNotOk(), logMiddleware('MyApi'));
```

The fetch implementation is optional and defaults to the global `fetch`. Pass one when the client needs a specific transport:

```ts
fetch: retryFetch(myFetch, { retries: 3 });
```

It is resolved on each attempt rather than captured when you call `retryFetch`, so a fetch replaced later, such as a test double, still applies.

`retryFetch` returns non-OK responses rather than throwing. Register `throwOnNotOk()` when the caller should handle failures as exceptions — `createErrorThrowingClient`'s type guarantee depends on it.

**Ordering matters here.** openapi-fetch runs `onResponse` in *reverse* registration order, so middleware registered after `throwOnNotOk()` runs before it and still observes the failing response:

```ts
client.use(throwOnNotOk(), logMiddleware('MyApi')); // logs the 500, then throws
client.use(logMiddleware('MyApi'), throwOnNotOk()); // throws first; the 500 is never logged
```

Retried requests do not re-enter `onRequest`. The request is cloned per attempt, so headers already applied survive and a body-bearing request can be sent more than once, but anything that must be recomputed per attempt — OAuth 1.0a signatures, HMAC-over-body, short-lived bearer tokens — needs the `onRetry` callback, which can return a replacement `Request`.

### `retryFetch` vs `retryWrapper`

`retryFetch` is HTTP-specific: it inspects status codes and distinguishes network errors from application failures. `retryWrapper` retries *any* async function and triggers only on a thrown error. Reach for `retryWrapper` when retrying something that is not a fetch, such as an SDK call.

### Migrating from `retryMiddleware`

`retryMiddleware` is deprecated. It retried inside its own `onResponse` hook, so retried responses re-entered the chain past any middleware registered after it — response-transforming middleware silently skipped them, returning a body in the wrong shape rather than an error.

```ts
// Before — xmlToJsonMiddleware never sees a retried response
const client = createClient<paths>({ baseUrl });
client.use(retryMiddleware({ throwOnNotOk: true }), xmlToJsonMiddleware());

// After — every attempt flows through the whole chain
const client = createClient<paths>({ baseUrl, fetch: retryFetch() });
client.use(throwOnNotOk(), xmlToJsonMiddleware());
```

Config mapping:

| `retryMiddleware` | `retryFetch` |
| --- | --- |
| `fetch` | optional first argument to `retryFetch`, defaulting to the global fetch |
| `throwOnNotOk` | the separate `throwOnNotOk()` middleware |
| `shouldResetTimeout` | no equivalent — the caller's `AbortSignal` is honoured throughout, including during backoff |
| `retryOn` | same, but see below |
| everything else | unchanged |

One behavioural difference to check when migrating: under `retryMiddleware`, supplying `retryOn` replaced the status check *and* left network errors retrying through a separate path. Under `retryFetch`, `retryOn` is an allow-list of statuses only — network errors continue to go through `retryCondition`, and `idempotentOnly` applies to the `retryOn` path too. A `POST` returning a listed status is therefore no longer retried unless you set `idempotentOnly: false`.

## Deprecations

`fetchSsmParams` and `S3Dao` are deprecated in favour of `SSMService` and
`S3Service` from [`@aligent/aws-wrappers`](../aws-wrappers/README.md), which add
Powertools structured logging and X-Ray tracing by default.

### `fetchSsmParams` → `SSMService`

Parameters are addressed by caller-chosen aliases rather than positionally, and
values are returned directly instead of wrapped in SDK `Parameter` objects.

```ts
// Before
const [username, password] = await fetchSsmParams('/app/username', '/app/password');
console.log(username?.Value);

// After
const ssm = new SSMService();
const { username, password } = await ssm.getParameters({
  username: '/app/username',
  password: '/app/password',
});
```

For a single parameter, use `ssm.getParameter('/app/username')`.

### `S3Dao` → `S3Service`

`S3Service` takes the bucket per call rather than per instance, so one instance
serves every bucket. `Key` is always explicit — supply the `object-hash` value
yourself if you relied on `storeData`'s hashed default.

```ts
// Before
const dao = new S3Dao('my-bucket');
const object = await dao.storeData(payload, key);
const data = await dao.fetchData<Payload>(object);
await dao.deleteData(object);

// After
const s3 = new S3Service();
await s3.putJsonObject({ Bucket: 'my-bucket', Key: key, Body: payload });
const data = await s3.getJsonObject<Payload>({ Bucket: 'my-bucket', Key: key });
await s3.deleteObject({ Bucket: 'my-bucket', Key: key });
```

| `S3Dao`        | `S3Service`                             |
| -------------- | --------------------------------------- |
| `storeData`    | `putJsonObject`                         |
| `fetchData`    | `getJsonObject`                         |
| `deleteData`   | `deleteObject`                          |
| `storeChunked` | `chunkBy` + `putJsonObject` per chunk   |
| `fetchChunks`  | iterate keys, `getJsonObject` per chunk |

`storeChunked` and `fetchChunks` have no direct equivalent — compose the
existing `chunkBy` helper with the per-object methods:

```ts
const s3 = new S3Service();
const keys = await Promise.all(
  chunkBy(rows, 100).map(async (chunk, i) => {
    const Key = `${prefix}/${i}`;
    await s3.putJsonObject({ Bucket: 'my-bucket', Key, Body: chunk });
    return Key;
  })
);

for (const Key of keys) {
  const chunk = await s3.getJsonObject<Row[]>({ Bucket: 'my-bucket', Key });
}
```

## Build

This library is written in typescript and can be built using the NPM script:

```sh
npm install
npm run build
```

## Installation

You can locally install this package to your NPM projects by pulling this repo,
building it, then running:

```sh
npm install --save ./path/to/this/project
```

from your project root.

## Testing & Linting

Vitest tests, linting & type-checking can be run with

```sh
npm run test
```
