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
client.use(throwOnNotOk(), logMiddleware('MyApi', logger));
```

`logMiddleware` requires a `LoggerInterface` instance from `@aws-lambda-powertools/logger` (or similar logger interfaces). This produces structured JSON logs and avoids the `[Object] [Object]` problem that `console.log` has with nested objects.

The fetch implementation is optional and defaults to the global `fetch`. Pass one when the client needs a specific transport:

```ts
fetch: retryFetch(myFetch, { retries: 3 });
```

It is resolved on each attempt rather than captured when you call `retryFetch`, so a fetch replaced later, such as a test double, still applies.

`retryFetch` returns non-OK responses rather than throwing. Register `throwOnNotOk()` when the caller should handle failures as exceptions — `createErrorThrowingClient`'s type guarantee depends on it.

**Ordering matters here.** openapi-fetch runs `onResponse` in *reverse* registration order, so middleware registered after `throwOnNotOk()` runs before it and still observes the failing response:

```ts
client.use(throwOnNotOk(), logMiddleware('MyApi', logger)); // logs the 500, then throws
client.use(logMiddleware('MyApi', logger), throwOnNotOk()); // throws first; the 500 is never logged
```

Retried requests do not re-enter `onRequest`. The request is cloned per attempt, so headers already applied survive and a body-bearing request can be sent more than once, but anything that must be recomputed per attempt — OAuth 1.0a signatures, HMAC-over-body, short-lived bearer tokens — needs the `onRetry` callback, which can return a replacement `Request`.

### `retryFetch` vs `retryWrapper`

`retryFetch` is HTTP-specific: it inspects status codes and distinguishes network errors from application failures. `retryWrapper` retries *any* async function and triggers only on a thrown error. Reach for `retryWrapper` when retrying something that is not a fetch, such as an SDK call.

### `retryWrapper`'s attempt timeline

`calculateDelay(attempt, previousDelay)` computes the delay before the retry *following* `attempt` — `previousDelay` is the delay being waited before `attempt` itself, not the one being computed. This traces `retryWrapper(fn, { retries: 3, delay: 100, backoffAmount: 50 })` against an `fn` that always throws (the same inputs as the `calculateDelay` describe block in `retry-wrapper.test.ts`):

![retryWrapper attempt timeline: four failing attempts, each calculateDelay call setting the wait one attempt ahead, and the fourth attempt skipping every hook once retries are exhausted](diagrams/attempt-timeline.svg)

Source: [`diagrams/attempt-timeline.svg`](diagrams/attempt-timeline.svg) — plain hand-editable SVG, no build step.

Two things worth taking from it: `calculateDelay(1, 100)` returns `150`, the delay before the retry following attempt 1 — not attempt 1's own wait, which is `previousDelay` (100); and attempt 4 skips `shouldRetry`/`calculateDelay`/`onRetry` entirely once `retries` are exhausted, so a throwing hook can't mask the real error on an attempt that was never going to retry anyway.

### Migrating from `retryMiddleware`

`retryMiddleware` was removed in v2. It retried inside its own `onResponse` hook, so retried responses re-entered the chain past any middleware registered after it — response-transforming middleware silently skipped them, returning a body in the wrong shape rather than an error.

```ts
// Before — xmlToJsonMiddleware never sees a retried response
const client = createClient<paths>({ baseUrl });
client.use(retryMiddleware({ throwOnNotOk: true }), parseXmlResponse());

// After — every attempt flows through the whole chain
const client = createClient<paths>({ baseUrl, fetch: retryFetch() });
client.use(throwOnNotOk(), parseXmlResponse());
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

## Request Timeout

`requestTimeout` adds an `AbortSignal.timeout` to each request via `onRequest`. If the caller already supplies a signal (e.g. for Lambda lifetime), both signals are composed with `AbortSignal.any` so that whichever fires first aborts the request.

```ts
client.use(requestTimeout(5000));
```

**Interaction with `retryFetch`:** Because `requestTimeout` runs once in `onRequest` before the request reaches `retryFetch`, and `Request.clone()` preserves the original signal, the timeout acts as a **single deadline across all retry attempts** — not a per-attempt limit. A `TimeoutError` is not classified as a network error, so `retryFetch` will not retry it.

If you need a per-attempt timeout, wrap the base fetch instead:

```ts
const timeoutFetch: typeof fetch = (input, init) => {
  const request = new Request(input, init);
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(5000)]);
  return fetch(new Request(request, { signal }));
};

const client = createClient<paths>({
  baseUrl,
  fetch: retryFetch(timeoutFetch, { retries: 3 }),
});
```

## XML Response Parsing

`parseXmlResponse` converts XML responses to JSON in `onResponse`, so every downstream layer works with a single body format. Only `application/xml`, `text/xml`, and `+xml` subtypes are converted — `application/xhtml+xml` and non-XML responses pass through untouched.

```ts
client.use(parseXmlResponse());
```

The optional `ExpressionSet` parameter controls array normalisation. XML has no way to distinguish a one-element list from a scalar, so `fast-xml-parser` collapses single-child elements to a plain value by default. Pass an `ExpressionSet` with jPath patterns for nodes that should always be arrays:

```ts
import { Expression, ExpressionSet } from 'path-expression-matcher';

const expressions = new ExpressionSet();
expressions.add(new Expression('Root.Items.Item'));

client.use(parseXmlResponse(expressions));
```

> **Note:** `fast-xml-parser` does not validate XML. A non-XML document served with an XML content-type may parse to `{}`. Register `logMiddleware` before `parseXmlResponse` to capture the raw response for debugging.

## Middleware Ordering

openapi-fetch runs `onRequest` hooks in registration order and `onResponse` hooks in **reverse** registration order. A typical registration:

```ts
const client = createClient<paths>({
  baseUrl,
  fetch: retryFetch({ retries: 3 }),
});
client.use(
  requestTimeout(30_000),   // onRequest: adds deadline signal
  throwOnNotOk(),           // onResponse (last): throws on non-2xx
  parseXmlResponse(),       // onResponse: XML → JSON before throwOnNotOk inspects the body
  logMiddleware('MyApi', logger),   // onResponse (first): logs the raw response before any transformation
);
```

The `onResponse` execution order for the example above is: `logMiddleware` → `parseXmlResponse` → `throwOnNotOk`.

## Peer Dependencies

This package requires `@aws-lambda-powertools/logger` (^2.0.0) as a peer dependency for the `logMiddleware` function. Install it alongside this package:

```sh
npm install @aws-lambda-powertools/logger
```

## Removed in v2

`fetchSsmParams` and `S3Dao` were removed in v2 in favour of `SSMService` and
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

The package is dual-published as both CommonJS and ES modules via `@nx/rollup`.

```sh
npx nx build microservice-util-lib
```

The build produces:

```
dist/
├── cjs/          # CommonJS (index.cjs)
├── esm/          # ES modules (index.mjs)
├── package.json  # publishable manifest with exports map
├── README.md
└── docs/
```

ESM consumers get tree-shakeable imports; CJS consumers continue to work unchanged via the conditional `exports` map.

## Testing & Linting

Vitest tests, linting & type-checking can be run from the repo root:

```sh
npm run test
npm run lint
npm run check-types
```
