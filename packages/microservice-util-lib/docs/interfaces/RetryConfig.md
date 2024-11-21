[**@aligent/microservice-util-lib**](../modules.md) • **Docs**

---

[@aligent/microservice-util-lib](../modules.md) / RetryConfig

# Interface: RetryConfig

Configuration for the retryWrapper

## Properties

<a id="backoffamount" name="backoffamount"></a>

### backoffAmount?

> `optional` **backoffAmount**: `number`

The amount to increase the delay by each retry (in ms)

#### Default

```ts
0;
```

#### Defined in

[retry-wrapper/retry-wrapper.ts:17](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L17)

---

<a id="delay" name="delay"></a>

### delay?

> `optional` **delay**: `number`

The base delay between retries (in ms)

#### Default

```ts
0;
```

#### Defined in

[retry-wrapper/retry-wrapper.ts:12](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L12)

---

<a id="onretry" name="onretry"></a>

### onRetry()?

> `optional` **onRetry**: (`retries`, `error`, `config`) => `void`

A callback to run before each retry

#### Parameters

• **retries**: `number`

the number of retries so far (will start at 1)

• **error**: `Error`

the error from the last attempt

• **config**: [`RetryConfig`](RetryConfig.md)

the configuration supplied to the retryWrapper

#### Returns

`void`

#### Defined in

[retry-wrapper/retry-wrapper.ts:24](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L24)

---

<a id="retries" name="retries"></a>

### retries?

> `optional` **retries**: `number`

The number of retries to attempt after the first run

#### Default

```ts
1;
```

#### Defined in

[retry-wrapper/retry-wrapper.ts:7](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/retry-wrapper/retry-wrapper.ts#L7)
