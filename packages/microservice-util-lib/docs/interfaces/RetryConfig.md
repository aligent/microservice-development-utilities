[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / RetryConfig

# Interface: RetryConfig

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:2](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L2)

Configuration for the retryWrapper

## Properties

<a id="backoffamount"></a>

### backoffAmount?

> `optional` **backoffAmount?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:17](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L17)

The amount to increase the delay by each retry (in ms)

#### Default

```ts
0
```

***

<a id="delay"></a>

### delay?

> `optional` **delay?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:12](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L12)

The base delay between retries (in ms)

#### Default

```ts
0
```

***

<a id="onretry"></a>

### onRetry?

> `optional` **onRetry?**: (`retries`, `error`, `config`) => `void`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:24](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L24)

A callback to run before each retry

#### Parameters

##### retries

`number`

the number of retries so far (will start at 1)

##### error

`Error`

the error from the last attempt

##### config

`RetryConfig`

the configuration supplied to the retryWrapper

#### Returns

`void`

***

<a id="retries"></a>

### retries?

> `optional` **retries?**: `number`

Defined in: [packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts:7](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L7)

The number of retries to attempt after the first run

#### Default

```ts
1
```
