[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / RetryConditionFn

# Type Alias: RetryConditionFn

> **RetryConditionFn** = (`context`, `idempotentOnly`) => `boolean` \| `Promise`\<`boolean`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:25](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L25)

Function type for custom retry condition.
Returns true if the request should be retried.

## Parameters

### context

[`RetryContext`](../interfaces/RetryContext.md)

The retry context containing attempt information.

### idempotentOnly

`boolean`

Whether to retry only when the HTTP method is idempotent.

## Returns

`boolean` \| `Promise`\<`boolean`\>

Whether to retry the request.
