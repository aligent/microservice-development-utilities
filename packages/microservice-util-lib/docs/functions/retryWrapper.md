[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / retryWrapper

# Function: retryWrapper()

> **retryWrapper**\<`T`\>(`fn`, `config`): `Promise`\<`T`\>

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:78](https://github.com/aligent/microservice-development-utilities/blob/b0663196a9151bf212120e65463afd54a6c9e6a3/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L78)

Retry an async function if it fails

## Type Parameters

### T

`T`

## Parameters

### fn

() => `Promise`\<`T`\>

the function to be retried

### config

[`RetryWrapperConfig`](../interfaces/RetryWrapperConfig.md)

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
