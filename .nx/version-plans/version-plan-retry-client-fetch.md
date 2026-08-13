---
microservice-util-lib: minor
---

`retryMiddleware` now performs its retries using the fetch the client was created with (`ClientOptions.fetch`) instead of the global `fetch`, falling back to the global only when the client does not configure one. An explicitly configured `fetch` in the retry config still takes precedence.

Previously a fetch injected into `createClient` applied to the initial request but not to any retry, so retries silently bypassed the injected transport. In tests this meant a fetch double saw one call while the retry escaped to the network; in production it meant instrumentation, proxying, or body transformation wired into the client's fetch was skipped on exactly the path that is least exercised. Both the `onResponse` and `onError` (network error) retry paths are fixed.

This covers the fetch function only. `ClientOptions.requestInitExt` is passed by openapi-fetch as the second argument to the initial fetch and is not exposed to middleware, so it remains unavailable to retries — a `dispatcher` set there still applies to the first attempt alone. That limitation is unchanged by this release and is now documented.

Released as a minor rather than a patch because the transport used for retries changes observably for any consumer that configured a client fetch without also passing `fetch` to `retryMiddleware`.

Also in this release:

- The README documents `retryMiddleware`'s ordering constraint. Because openapi-fetch runs `onResponse` once per request in reverse registration order, and the middleware retries inside its own hook, **any middleware registered after `retryMiddleware` is skipped for retried responses**. Response-transforming middleware is the dangerous case: the first attempt is transformed and a retried attempt is not, so the caller receives a body in the wrong shape rather than an error. Reordering does not fully resolve this — placing the transform first makes it run after retry, which leaves `throwOnNotOk` building `HttpResponseError` from untransformed error bodies. The documented workaround is to apply the transform in the fetch handed to the client so every attempt passes through it. This is a documentation change only; the composition behaviour is unchanged.
