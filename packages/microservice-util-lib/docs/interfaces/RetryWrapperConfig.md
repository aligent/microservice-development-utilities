[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / RetryWrapperConfig

# Interface: RetryWrapperConfig

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:21](https://github.com/aligent/microservice-development-utilities/blob/3299b477c44ea5ded7c52690ed62a5aa48c95908/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L21)

Configuration for the retryWrapper

## Properties

<a id="backoffamount"></a>

### backoffAmount?

> `optional` **backoffAmount?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:36](https://github.com/aligent/microservice-development-utilities/blob/3299b477c44ea5ded7c52690ed62a5aa48c95908/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L36)

The amount to increase the delay by each retry (in ms)

#### Default

```ts
0
```

***

<a id="calculatedelay"></a>

### calculateDelay?

> `optional` **calculateDelay?**: (`attempt`, `previousDelay`, `config`) => `number` \| `Promise`\<`number`\>

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:63](https://github.com/aligent/microservice-development-utilities/blob/3299b477c44ea5ded7c52690ed62a5aa48c95908/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L63)

Computes the delay (ms) before the next retry.

#### Parameters

##### attempt

`number`

the retry attempt about to be made (1-indexed, matching `onRetry`)

##### previousDelay

`number`

the delay (ms) that was used for the attempt that just failed

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

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:74](https://github.com/aligent/microservice-development-utilities/blob/3299b477c44ea5ded7c52690ed62a5aa48c95908/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L74)

Total wall-clock ms budget across all attempts, measured from the first call.
Once exceeded, the next retry is skipped and the last error is thrown immediately,
regardless of `retries` remaining.

#### Default

undefined — no deadline, `retries` is the only bound

***

<a id="delay"></a>

### delay?

> `optional` **delay?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:31](https://github.com/aligent/microservice-development-utilities/blob/3299b477c44ea5ded7c52690ed62a5aa48c95908/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L31)

The base delay between retries (in ms)

#### Default

```ts
0
```

***

<a id="onretry"></a>

### onRetry?

> `optional` **onRetry?**: (`retries`, `error`, `config`, `delayMs`) => `void`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:46](https://github.com/aligent/microservice-development-utilities/blob/3299b477c44ea5ded7c52690ed62a5aa48c95908/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L46)

A callback to run before each retry

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

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:26](https://github.com/aligent/microservice-development-utilities/blob/3299b477c44ea5ded7c52690ed62a5aa48c95908/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L26)

The number of retries to attempt after the first run

#### Default

```ts
1
```

***

<a id="shouldretry"></a>

### shouldRetry?

> `optional` **shouldRetry?**: (`error`, `attempt`) => `boolean` \| `Promise`\<`boolean`\>

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:55](https://github.com/aligent/microservice-development-utilities/blob/3299b477c44ea5ded7c52690ed62a5aa48c95908/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L55)

Decides whether a given error should trigger a retry. Checked before any delay
is calculated; returning false rethrows the error immediately instead of
continuing to retry.

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
