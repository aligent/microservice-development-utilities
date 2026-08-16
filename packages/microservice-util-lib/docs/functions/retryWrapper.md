[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / retryWrapper

# Function: retryWrapper()

> **retryWrapper**\<`T`\>(`fn`, `config`): `Promise`\<`T`\>

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:176](https://github.com/aligent/microservice-development-utilities/blob/3299b477c44ea5ded7c52690ed62a5aa48c95908/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L176)

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

## Examples

```ts
retryWrapper(someAsyncFunction, {
  retries: 3,
  onRetry: (_, error) => console.error(error)
});
```

```ts
// Only retry a specific error, back off exponentially with jitter, and give up
// after 10s regardless of retries remaining
retryWrapper(someAsyncFunction, {
  retries: 5,
  delay: 100,
  shouldRetry: (error) => error.name === 'TransientError',
  calculateDelay: exponentialJitter(100, 5000),
  deadline: 10_000,
});
```
