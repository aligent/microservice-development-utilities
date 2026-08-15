[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / retryWrapper

# Function: retryWrapper()

> **retryWrapper**\<`T`\>(`fn`, `config`): `Promise`\<`T`\>

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:158](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L158)

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
  calculateDelay: (attempt) => Math.min(100 * 2 ** attempt, 5000) + Math.random() * 100,
  deadline: 10_000,
});
```
