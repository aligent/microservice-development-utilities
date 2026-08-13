[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / retryWrapper

# Function: retryWrapper()

> **retryWrapper**\<`T`\>(`fn`, `config`): `Promise`\<`T`\>

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:78](https://github.com/aligent/microservice-development-utilities/blob/2924feaebbc12f9d81d6c8e146827daf51044cc9/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L78)

Retry an async function if it fails

## Type Parameters

### T

`T`

## Parameters

### fn

() => `Promise`\<`T`\>

the function to be retried

### config

[`RetryConfig`](../interfaces/RetryConfig.md)

the configuration for retries

## Returns

`Promise`\<`T`\>

## Example

```ts
retryWrapper(someAsyncFunction, {
  retries: 3,
  onRetry: (_, error) => console.error(error)
});
```
