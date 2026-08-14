---
nx-openapi: minor
---

Generated clients now wire retries into the client's `fetch` via `retryFetch` instead of registering the deprecated `retryMiddleware`, and register `throwOnNotOk()` for non-2xx responses.

Registering retry as middleware meant a retried response re-entered the middleware chain past anything registered after it, so response-transforming middleware silently skipped retried attempts. Wiring it into `fetch` puts retries beneath the chain, so every attempt flows through it.

The generated registration order also changes to `throwOnNotOk(), logMiddleware(...)`. `onResponse` runs in reverse registration order, so previously `retryMiddleware` threw before `logMiddleware` ran and **generated clients never logged a failing response**. With the logger registered after `throwOnNotOk()`, failures are logged and still thrown.

Also in this release:

- Auth middleware insertion no longer anchors on a statement containing `retryMiddleware`. It anchors on the `this.client.use(...)` call itself, and now throws when no such statement is present rather than silently emitting a client with no auth middleware. Keying the anchor to a specific middleware name was what made it fragile: it stopped matching as soon as retry moved out of the chain.

Existing generated clients are untouched — `client.ts` is only scaffolded on first generation and preserved on override.
