[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / exponentialJitter

# Function: exponentialJitter()

> **exponentialJitter**(`baseDelay`, `maxDelay`): (`attempt`) => `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:249](https://github.com/aligent/microservice-development-utilities/blob/c4dce53ca953648ae0b3bf4b11ed6a027ecdec50/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L249)

A ready-made [RetryWrapperConfig.calculateDelay](../interfaces/RetryWrapperConfig.md#calculatedelay) strategy: full-jitter
exponential backoff, picking the delay for a given attempt uniformly at random
between 0 and `min(maxDelay, baseDelay * 2 ** attempt)`. Saves hand-rolling this
`Math.random()`/`Math.min()` formula per caller.

## Parameters

### baseDelay

`number`

the starting delay (ms), before exponential growth and jitter

### maxDelay

`number`

the delay (ms) ceiling, applied before jitter narrows it further

## Returns

(`attempt`) => `number`

## Example

```ts
// `delay` (the wait before the *first* retry) isn't itself computed by
// calculateDelay, so set it explicitly — here, matching baseDelay — or the
// first retry fires with the default 0ms delay before backoff kicks in.
retryWrapper(someAsyncFunction, {
  retries: 5,
  delay: 100,
  calculateDelay: exponentialJitter(100, 5000),
});
```
