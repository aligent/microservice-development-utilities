[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / RetryFetchConfig

# Interface: RetryFetchConfig

Defined in: [packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts:42](https://github.com/aligent/microservice-development-utilities/blob/e4e27a03012ecfd974f8553d44397f5e77d9c177/packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts#L42)

Configuration for [retryFetch](../functions/retryFetch.md).

 RetryFetchConfig

## Properties

<a id="basedelay"></a>

### baseDelay?

> `optional` **baseDelay?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts:44](https://github.com/aligent/microservice-development-utilities/blob/e4e27a03012ecfd974f8553d44397f5e77d9c177/packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts#L44)

Base delay in milliseconds for the built-in strategies.

***

<a id="idempotentonly"></a>

### idempotentOnly?

> `optional` **idempotentOnly?**: `boolean`

Defined in: [packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts:50](https://github.com/aligent/microservice-development-utilities/blob/e4e27a03012ecfd974f8553d44397f5e77d9c177/packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts#L50)

Retry only GET, HEAD, OPTIONS, PUT and DELETE.
- Set `false` to retry POST and PATCH, accepting the risk of a duplicated write when the
  server processed a request whose response was lost.

Note there is no `throwOnNotOk`: `retryFetch` returns non-OK responses as-is. Register the
`throwOnNotOk()` middleware when the caller should receive an `HttpResponseError` instead.

***

<a id="maxdelay"></a>

### maxDelay?

> `optional` **maxDelay?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts:45](https://github.com/aligent/microservice-development-utilities/blob/e4e27a03012ecfd974f8553d44397f5e77d9c177/packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts#L45)

Upper bound in milliseconds for the built-in strategies.

***

<a id="onretry"></a>

### onRetry?

> `optional` **onRetry?**: [`OnRetryFn`](../type-aliases/OnRetryFn.md)

Defined in: [packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts:47](https://github.com/aligent/microservice-development-utilities/blob/e4e27a03012ecfd974f8553d44397f5e77d9c177/packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts#L47)

Called before each retry, never before the first attempt.
- Receives a clone of the request, so reading the body to re-sign it is safe.
- Returning a `Request` replaces the one used for the retry; returning `void` keeps it.

***

<a id="retries"></a>

### retries?

> `optional` **retries?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts:43](https://github.com/aligent/microservice-development-utilities/blob/e4e27a03012ecfd974f8553d44397f5e77d9c177/packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts#L43)

The maximum number of retry attempts after the first.

***

<a id="retrycondition"></a>

### retryCondition?

> `optional` **retryCondition?**: [`RetryConditionFn`](../type-aliases/RetryConditionFn.md)

Defined in: [packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts:49](https://github.com/aligent/microservice-development-utilities/blob/e4e27a03012ecfd974f8553d44397f5e77d9c177/packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts#L49)

Decides whether to retry. Defaults to 5xx, 429, 408 and network errors.
- Ignored for responses whose status is checked against `retryOn`, when that is supplied.

***

<a id="retrydelay"></a>

### retryDelay?

> `optional` **retryDelay?**: [`RetryDelayFn`](../type-aliases/RetryDelayFn.md) \| `"exponential"` \| `"linear"`

Defined in: [packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts:46](https://github.com/aligent/microservice-development-utilities/blob/e4e27a03012ecfd974f8553d44397f5e77d9c177/packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts#L46)

Strategy for calculating the delay between retries.
     - 'exponential': `baseDelay * 2^(attempt - 1)`
     - 'linear': `baseDelay * attempt`
     - Custom function: receives the attempt number and the [RetryContext](RetryContext.md).

***

<a id="retryon"></a>

### retryOn?

> `optional` **retryOn?**: `number`[]

Defined in: [packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts:48](https://github.com/aligent/microservice-development-utilities/blob/e4e27a03012ecfd974f8553d44397f5e77d9c177/packages/microservice-util-lib/src/retry-fetch/retry-fetch.ts#L48)

Allow-list of HTTP status codes that trigger a retry, replacing the default status check.
- Applies to *statuses only*: network errors still retry via `retryCondition`, and
  `idempotentOnly` still applies.
