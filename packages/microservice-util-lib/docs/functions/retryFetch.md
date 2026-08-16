[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / retryFetch

# Function: retryFetch()

## Call Signature

> **retryFetch**(`config?`): (`input`, `init?`) => `Promise`\<`Response`\>

Defined in: [packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts:139](https://github.com/aligent/microservice-development-utilities/blob/c4dce53ca953648ae0b3bf4b11ed6a027ecdec50/packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts#L139)

Wraps a fetch implementation with retry behaviour.

Retries happen beneath any openapi-fetch middleware chain, so every attempt's
response flows through the full chain rather than only the first.

Omit the fetch implementation to use the global fetch. It is resolved on each
attempt rather than captured here, so a fetch replaced later (a test double, or
runtime instrumentation) still applies.

### Parameters

#### config?

[`RetryFetchConfig`](../interfaces/RetryFetchConfig.md)

The retry configuration.

### Returns

A fetch function that retries according to the configuration.

(`input`, `init?`) => `Promise`\<`Response`\>

### Examples

```ts
// Global fetch, default retry behaviour
const client = createClient<paths>({ baseUrl, fetch: retryFetch() });
```

```ts
// Global fetch, custom configuration
const client = createClient<paths>({ baseUrl, fetch: retryFetch({ retries: 5 }) });
```

```ts
// A specific transport, such as the one the client was configured with
const client = createClient<paths>({ baseUrl, fetch: retryFetch(myFetch, { retries: 5 }) });
```

## Call Signature

> **retryFetch**(`fetchImpl?`, `config?`): (`input`, `init?`) => `Promise`\<`Response`\>

Defined in: [packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts:148](https://github.com/aligent/microservice-development-utilities/blob/c4dce53ca953648ae0b3bf4b11ed6a027ecdec50/packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts#L148)

Accepts `undefined` so an optional transport can be passed straight through,
such as `retryFetch(options.fetch)` where `ClientOptions.fetch` may be unset.

### Parameters

#### fetchImpl?

(`input`, `init?`) => `Promise`\<`Response`\>

The fetch implementation to wrap.

#### config?

[`RetryFetchConfig`](../interfaces/RetryFetchConfig.md)

The retry configuration.

### Returns

A fetch function that retries according to the configuration.

(`input`, `init?`) => `Promise`\<`Response`\>
