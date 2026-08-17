[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / OnRetryFn

# Type Alias: OnRetryFn

> **OnRetryFn** = (`context`) => `Request` \| `void` \| `Promise`\<`Request` \| `void`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:52](https://github.com/aligent/microservice-development-utilities/blob/cd832d84246fb7f35100fa0dda063c453dfda731/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L52)

Function type for the onRetry callback.
Called before each retry attempt.

- If the function returns a `Request` (or `Promise<Request>`), that request replaces
  the current one for the retry attempt. This is useful for regenerating authentication
  headers (e.g., OAuth 1.0a re-signing).
- If the function returns `void`, the original request is used as-is.

## Parameters

### context

[`RetryContext`](../interfaces/RetryContext.md)

The retry context containing attempt information.

## Returns

`Request` \| `void` \| `Promise`\<`Request` \| `void`\>
