---
microservice-util-lib: minor
---

Adds `retryFetch(config)`, a retry wrapper intended for `ClientOptions.fetch`, and deprecates `retryMiddleware`. A specific transport can be passed as an optional first argument, `retryFetch(myFetch, config)`; otherwise the global fetch is used, resolved on each attempt rather than captured up front so a fetch replaced later still applies.

`retryMiddleware` retried inside its own `onResponse` hook. openapi-fetch runs `onResponse` once per request in reverse registration order, so a retried response re-entered the chain at the middleware's position — **any middleware registered after it was silently skipped for retried responses**. Response-transforming middleware was the dangerous case: the first attempt was transformed, a retried attempt was not, and the caller received a body in the wrong shape rather than an error. It caused a production Lambda failure where a healthy `200` carrying XML reached `JSON.parse`.

`retryFetch` retries beneath the chain, so every attempt's response flows through it. This also means `ClientOptions.requestInitExt` now applies to retries — openapi-fetch passes it only to the initial fetch and does not expose it to middleware, so a `dispatcher` set there previously applied to the first attempt alone.

Also in this release:

- **`throwOnNotOk()` is now its own middleware.** `retryFetch` only retries and returns non-OK responses as-is. Previously the `throwOnNotOk` flag did two jobs: `true` meant logging middleware never observed a 500, `false` meant it did but the caller lost the throw. Split apart, `client.use(throwOnNotOk(), logMiddleware(...))` gives both — a combination the middleware could not express. `createErrorThrowingClient`'s type guarantee now depends on `throwOnNotOk()` being registered; its docs have been updated.
- **`RetryConfig` is renamed to `RetryWrapperConfig`**, with `RetryConfig` kept as a deprecated alias. The old name collided with the retry middleware's own config, which forced that one to be re-exported as `RetryMiddlewareConfig`.
- `retryWrapper` is unchanged and stays for retrying non-HTTP work. The README documents when to reach for each.

Nothing is removed; `retryMiddleware` and `RetryConfig` continue to work under `@deprecated` tags and will be removed in the next major.
