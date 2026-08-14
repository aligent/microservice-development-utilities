---
microservice-util-lib: minor
nx-openapi: minor
---

## `@aligent/microservice-util-lib`

Adds `retryFetch(config)`, a retry wrapper intended for `ClientOptions.fetch`, and deprecates `retryMiddleware`. A specific transport can be passed as an optional first argument, `retryFetch(myFetch, config)`; otherwise the global fetch is used, resolved on each attempt rather than captured up front so a fetch replaced later still applies.

`retryMiddleware` retried inside its own `onResponse` hook. openapi-fetch runs `onResponse` once per request in reverse registration order, so a retried response re-entered the chain at the middleware's position, and **any middleware registered after it was silently skipped for retried responses**. Response-transforming middleware was the dangerous case: the first attempt was transformed, a retried attempt was not, and the caller received a body in the wrong shape rather than an error. It caused a production Lambda failure where a healthy `200` carrying XML reached `JSON.parse`.

`retryFetch` retries beneath the chain, so every attempt's response flows through it. This also means `ClientOptions.requestInitExt` now applies to retries. openapi-fetch passes it only to the initial fetch and does not expose it to middleware, so a `dispatcher` set there previously applied to the first attempt alone.

- **`throwOnNotOk()` is now its own middleware.** `retryFetch` only retries and returns non-OK responses as-is. Previously the `throwOnNotOk` flag did two jobs: `true` meant logging middleware never observed a 500, `false` meant it did but the caller lost the throw. Split apart, `client.use(throwOnNotOk(), logMiddleware(...))` gives both, a combination the middleware could not express. `createErrorThrowingClient`'s type guarantee now depends on `throwOnNotOk()` being registered; its docs have been updated.
- **`RetryConfig` is renamed to `RetryWrapperConfig`**, with `RetryConfig` kept as a deprecated alias. The old name collided with the retry middleware's own config, which forced that one to be re-exported as `RetryMiddlewareConfig`.
- `retryWrapper` is unchanged and stays for retrying non-HTTP work. The README documents when to reach for each.

Nothing is removed; `retryMiddleware` and `RetryConfig` continue to work under `@deprecated` tags and will be removed in the next major.

## `@aligent/nx-openapi`

Generated clients now wire retries into the client's `fetch` via `retryFetch` instead of registering the deprecated `retryMiddleware`, and register `throwOnNotOk()` for non-2xx responses.

The generated registration order also changes to `throwOnNotOk(), logMiddleware(...)`. `onResponse` runs in reverse registration order, so previously `retryMiddleware` threw before `logMiddleware` ran and **generated clients never logged a failing response**. With the logger registered after `throwOnNotOk()`, failures are logged and still thrown.

- Auth middleware insertion no longer anchors on a statement containing `retryMiddleware`. It anchors on the `this.client.use(...)` call itself, and now throws when no such statement is present rather than silently emitting a client with no auth middleware. Keying the anchor to a specific middleware name was what made it fragile: it stopped matching as soon as retry moved out of the chain.

Existing generated clients are untouched. `client.ts` is only scaffolded on first generation and preserved on override.

Release `microservice-util-lib` before or alongside `nx-openapi`: generated clients import `retryFetch` and `throwOnNotOk`.
