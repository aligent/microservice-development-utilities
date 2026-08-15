[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / RetryWrapperConfig

# Interface: RetryWrapperConfig

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:21](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L21)

Configuration for the retryWrapper

## Properties

<a id="backoffamount"></a>

### backoffAmount?

> `optional` **backoffAmount?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:36](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L36)

The amount to increase the delay by each retry (in ms)

#### Default

```ts
0
```

***

<a id="calculatedelay"></a>

### calculateDelay?

> `optional` **calculateDelay?**: (`attempt`, `previousDelay`, `config`) => `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:60](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L60)

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

`number`

#### Default

```ts
(attempt, previousDelay, config) => previousDelay + config.backoffAmount — linear growth
```

***

<a id="deadline"></a>

### deadline?

> `optional` **deadline?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:67](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L67)

Total wall-clock ms budget across all attempts, measured from the first call.
Once exceeded, the next retry is skipped and the last error is thrown immediately,
regardless of `retries` remaining.

#### Default

undefined — no deadline, `retries` is the only bound

***

<a id="delay"></a>

### delay?

> `optional` **delay?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:31](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L31)

The base delay between retries (in ms)

#### Default

```ts
0
```

***

<a id="onretry"></a>

### onRetry?

> `optional` **onRetry?**: (`retries`, `error`, `config`) => `void`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:43](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L43)

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

#### Returns

`void`

***

<a id="retries"></a>

### retries?

> `optional` **retries?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:26](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L26)

The number of retries to attempt after the first run

#### Default

```ts
1
```

***

<a id="shouldretry"></a>

### shouldRetry?

> `optional` **shouldRetry?**: (`error`, `attempt`) => `boolean`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:52](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L52)

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

`boolean`

#### Default

```ts
() => true — retries every error
```
