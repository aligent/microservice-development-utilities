[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / RetryDelayFn

# Type Alias: RetryDelayFn

> **RetryDelayFn** = (`attempt`, `context`) => `number` \| `Promise`\<`number`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts:38](https://github.com/aligent/microservice-development-utilities/blob/e4e27a03012ecfd974f8553d44397f5e77d9c177/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/retry.ts#L38)

Function type for custom retry delay calculation.
Returns the delay in milliseconds before the next retry attempt.

## Parameters

### attempt

`number`

The current attempt number (1-indexed).

### context

[`RetryContext`](../interfaces/RetryContext.md)

The retry context containing attempt information.

## Returns

`number` \| `Promise`\<`number`\>

The delay in milliseconds.
