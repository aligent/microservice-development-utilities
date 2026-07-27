[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / RetryMiddlewareConfig

# Interface: RetryMiddlewareConfig

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:96](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L96)

Configuration for the retry middleware.

This interface provides options to configure retry behavior, including:
- Number of retry attempts
- Custom retry conditions
- Retry delay strategies (exponential backoff, linear, custom)
- Callbacks for retry events

 RetryConfig

## Properties

<a id="basedelay"></a>

### baseDelay?

> `optional` **baseDelay?**: `number`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:100](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L100)

Base delay in milliseconds for built-in delay strategies.

***

<a id="fetch"></a>

### fetch?

> `optional` **fetch?**: (`input`, `init?`) => `Promise`\<`Response`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:107](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L107)

Custom fetch function to use for retries. Defaults to the global fetch function.
- Useful for testing or using a custom fetch implementation.

#### Parameters

##### input

`string` \| `Request` \| `URL`

##### init?

`RequestInit`

#### Returns

`Promise`\<`Response`\>

***

<a id="idempotentonly"></a>

### idempotentOnly?

> `optional` **idempotentOnly?**: `boolean`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:105](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L105)

Whether to retry only when the HTTP method is idempotent.
- Defaults to `true`, retrying only on GET, HEAD, OPTIONS, PUT, or DELETE methods.

***

<a id="maxdelay"></a>

### maxDelay?

> `optional` **maxDelay?**: `number`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:101](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L101)

Maximum delay in milliseconds between retry attempts.

***

<a id="onretry"></a>

### onRetry?

> `optional` **onRetry?**: `OnRetryFn`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:103](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L103)

Callback executed before each retry attempt (not the initial request).
- If it returns a `Request`, that request replaces the current one for the retry.
  Useful for regenerating authentication headers (e.g., OAuth 1.0a re-signing).
- If it returns `void`, the original request is used as-is.

***

<a id="retries"></a>

### retries?

> `optional` **retries?**: `number`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:97](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L97)

The maximum number of retry attempts.

***

<a id="retrycondition"></a>

### retryCondition?

> `optional` **retryCondition?**: `RetryConditionFn`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:98](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L98)

Custom function to determine if a request should be retried.
- Defaults to retrying on 5xx, 429, 408 errors and network errors.

***

<a id="retrydelay"></a>

### retryDelay?

> `optional` **retryDelay?**: `RetryDelayFn` \| `"exponential"` \| `"linear"`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:99](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L99)

Strategy for calculating delay between retries.
     - 'exponential': Exponential backoff (100ms * 2^attemptNumber)
     - 'linear': Linear backoff (100ms * attemptNumber)
     - Custom function: Allows custom delay calculation

***

<a id="retryon"></a>

### retryOn?

> `optional` **retryOn?**: `number`[]

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:104](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L104)

Array of HTTP status codes that should trigger a retry.
- Defaults to 5xx, 429, and 408 errors.

***

<a id="shouldresettimeout"></a>

### shouldResetTimeout?

> `optional` **shouldResetTimeout?**: `boolean`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:102](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L102)

Whether to reset the timeout between retries.

***

<a id="throwonnotok"></a>

### throwOnNotOk?

> `optional` **throwOnNotOk?**: `boolean`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:106](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L106)

Whether to throw an `HttpResponseError` when the final response has a non-OK status (i.e. not 2xx).
- Defaults to `true` for backward compatibility.
- Set to `false` to return the response as-is, which allows downstream middlewares
  (e.g. logging middleware) to inspect the response before the caller handles the error.
