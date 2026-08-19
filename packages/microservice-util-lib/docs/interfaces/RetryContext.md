[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / RetryContext

# Interface: RetryContext

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:10](https://github.com/aligent/microservice-development-utilities/blob/039104d2966f94c9d0628f648b1827b63578171a/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L10)

Represents the context for a retry attempt.

 RetryContext

## Properties

<a id="attempt"></a>

### attempt

> **attempt**: `number`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:11](https://github.com/aligent/microservice-development-utilities/blob/039104d2966f94c9d0628f648b1827b63578171a/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L11)

The current attempt number (1-indexed).

***

<a id="error"></a>

### error

> **error**: `Error` \| `null`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:14](https://github.com/aligent/microservice-development-utilities/blob/039104d2966f94c9d0628f648b1827b63578171a/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L14)

The error that triggered the retry, if any.

***

<a id="request"></a>

### request

> **request**: `Request`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:12](https://github.com/aligent/microservice-development-utilities/blob/039104d2966f94c9d0628f648b1827b63578171a/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L12)

The original request being retried.

***

<a id="response"></a>

### response

> **response**: `Response` \| `null`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:13](https://github.com/aligent/microservice-development-utilities/blob/039104d2966f94c9d0628f648b1827b63578171a/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L13)

The response that triggered the retry.
