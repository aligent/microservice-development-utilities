[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / retryMiddleware

# ~~Function: retryMiddleware()~~

> **retryMiddleware**(`config?`): `Middleware`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/retry.ts:192](https://github.com/aligent/microservice-development-utilities/blob/9b108bd1d546cc33ffe07530fc02dfe4d839a9e0/packages/microservice-util-lib/src/openapi-fetch-middlewares/retry.ts#L192)

This middleware implements retry logic with support for:
- Configurable number of retry attempts
- Exponential backoff, linear backoff, or custom delay strategies
- Custom retry conditions
- Callbacks for retry events
- Filtering by status codes

## Parameters

### config?

[`RetryMiddlewareConfig`](../interfaces/RetryMiddlewareConfig.md)

The retry configuration.

## Returns

`Middleware`

The middleware for retry functionality.

## Deprecated

Use [retryFetch](retryFetch.md) with `ClientOptions.fetch`, plus `throwOnNotOk()` if you
relied on `throwOnNotOk: true`. Retrying inside `onResponse` means retried responses re-enter
the middleware chain past any middleware registered after this one, so response-transforming
middleware silently skips them. `retryFetch` retries beneath the chain, so every attempt flows
through it. See the package README for the migration.

## Examples

```ts
// Basic usage with defaults (3 retries, exponential backoff)
const middleware = retryMiddleware();
```

```ts
// Custom configuration with logging
const middleware = retryMiddleware({
    retries: 5,
    retryDelay: 'linear',
    baseDelay: 200,
    retryOn: [500, 502, 503, 504],
    onRetry: (context) => {
        console.log(`Retrying request (attempt ${context.attempt})`);
    },
});
```

```ts
// Re-sign OAuth 1.0a requests on retry (returns a Request to replace the original)
const middleware = retryMiddleware({
    retries: 3,
    onRetry: (context) => resignOauth10aRequest(context.request, oauthConfig),
});
```

```ts
// Combine logging and request transformation in onRetry
const middleware = retryMiddleware({
    retries: 3,
    onRetry: async (context) => {
        console.log(`Retrying request (attempt ${context.attempt})`);
        return resignOauth10aRequest(context.request, oauthConfig);
    },
});
```

```ts
// Custom retry condition
const middleware = retryMiddleware({
    retries: 3,
    retryCondition: async (context) => {
        // Only retry on 503 Service Unavailable
        return context.response?.status === 503;
    },
});
```

```ts
// Custom delay function
const middleware = retryMiddleware({
    retries: 3,
    retryDelay: (attemptNumber) => {
        // Custom delay with jitter
        const baseDelay = 100 * Math.pow(2, attemptNumber);
        const jitter = Math.random() * 100;
        return baseDelay + jitter;
    },
});
```
