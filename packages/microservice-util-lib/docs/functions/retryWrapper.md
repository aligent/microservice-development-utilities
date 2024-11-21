[**@aligent/microservice-util-lib**](../modules.md) • **Docs**

---

[@aligent/microservice-util-lib](../modules.md) / retryWrapper

# Function: retryWrapper()

> **retryWrapper**\<`T`\>(`fn`, `config`): `Promise`\<`T`\>

Retry an async function if it fails

## Type Parameters

• **T**

## Parameters

• **fn**

the function to be retried

• **config**: [`RetryConfig`](../interfaces/RetryConfig.md)

the configuration for retries

## Returns

`Promise`\<`T`\>

## Example

```ts
retryWrapper(someAsyncFunction, {
  retries: 3,
  onRetry: (_, error) => console.error(error),
});
```

## Defined in

[retry-wrapper/retry-wrapper.ts:78](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L78)
