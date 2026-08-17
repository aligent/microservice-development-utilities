[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / RetryWrapperConfig

# Interface: RetryWrapperConfig

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:21](https://github.com/aligent/microservice-development-utilities/blob/cd832d84246fb7f35100fa0dda063c453dfda731/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L21)

Configuration for the retryWrapper

## Properties

<a id="backoffamount"></a>

### backoffAmount?

> `optional` **backoffAmount?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:36](https://github.com/aligent/microservice-development-utilities/blob/cd832d84246fb7f35100fa0dda063c453dfda731/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L36)

The amount to increase the delay by each retry (in ms)

#### Default

```ts
0
```

***

<a id="calculatedelay"></a>

### calculateDelay?

> `optional` **calculateDelay?**: (`attempt`, `previousDelay`, `config`) => `number` \| `Promise`\<`number`\>

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:67](https://github.com/aligent/microservice-development-utilities/blob/cd832d84246fb7f35100fa0dda063c453dfda731/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L67)

Computes the delay (ms) before the next retry. Not called once `retries` are
exhausted, for the same reason as `shouldRetry`.

#### Parameters

##### attempt

`number`

the retry attempt whose following delay is being calculated

##### previousDelay

`number`

the delay used before that retry

##### config

`RetryWrapperConfig`

the configuration supplied to the retryWrapper

#### Returns

`number` \| `Promise`\<`number`\>

#### Default

```ts
(attempt, previousDelay, config) => previousDelay + config.backoffAmount — linear growth
```

***

<a id="deadline"></a>

### deadline?

> `optional` **deadline?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:81](https://github.com/aligent/microservice-development-utilities/blob/cd832d84246fb7f35100fa0dda063c453dfda731/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L81)

Total wall-clock ms budget across all attempts, measured from the first call.
Once the elapsed time plus the delay before the next retry would exceed this
budget, that retry is skipped and the last error is thrown immediately,
regardless of `retries` remaining. This bounds when the next attempt *starts*,
not how long an individual `fn()` invocation may run — a slow attempt can still
finish after the deadline has passed.

#### Default

undefined — no deadline, `retries` is the only bound

***

<a id="delay"></a>

### delay?

> `optional` **delay?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:31](https://github.com/aligent/microservice-development-utilities/blob/cd832d84246fb7f35100fa0dda063c453dfda731/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L31)

The base delay between retries (in ms)

#### Default

```ts
0
```

***

<a id="onretry"></a>

### onRetry?

> `optional` **onRetry?**: (`retries`, `error`, `config`, `delayMs`) => `void`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:48](https://github.com/aligent/microservice-development-utilities/blob/cd832d84246fb7f35100fa0dda063c453dfda731/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L48)

A callback to run before each retry. Not called once `retries` are exhausted,
or when `shouldRetry`/`deadline` prevent a further attempt — only fires before
an attempt that's actually about to happen.

#### Parameters

##### retries

`number`

the number of retries so far (will start at 1)

##### error

`Error`

the error from the last attempt

##### config

`RetryWrapperConfig`

the configuration supplied to the retryWrapper

##### delayMs

`number`

the delay (ms) that was actually just waited before this retry —
`config.delay` itself already holds the delay `calculateDelay` computed for the
*next* retry, not the one that was just waited, so read this instead of that

#### Returns

`void`

***

<a id="retries"></a>

### retries?

> `optional` **retries?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:26](https://github.com/aligent/microservice-development-utilities/blob/cd832d84246fb7f35100fa0dda063c453dfda731/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L26)

The number of retries to attempt after the first run

#### Default

```ts
1
```

***

<a id="shouldretry"></a>

### shouldRetry?

> `optional` **shouldRetry?**: (`error`, `attempt`) => `boolean` \| `Promise`\<`boolean`\>

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:58](https://github.com/aligent/microservice-development-utilities/blob/cd832d84246fb7f35100fa0dda063c453dfda731/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L58)

Decides whether a given error should trigger a retry. Checked before any delay
is calculated; returning false rethrows the error immediately instead of
continuing to retry. Not called once `retries` are exhausted — there's nothing
left to retry regardless of what this returns.

#### Parameters

##### error

`Error`

the error from the last attempt

##### attempt

`number`

the retry attempt about to be made (1-indexed, matching `onRetry`)

#### Returns

`boolean` \| `Promise`\<`boolean`\>

#### Default

```ts
() => true — retries every error
```
