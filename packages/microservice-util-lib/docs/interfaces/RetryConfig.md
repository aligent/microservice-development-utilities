[@aligent/microservice-util-lib](../modules.md) / RetryConfig

# Interface: RetryConfig

Configuration for the retryWrapper

## Table of contents

### Properties

- [backoffAmount](RetryConfig.md#backoffamount)
- [delay](RetryConfig.md#delay)
- [onRetry](RetryConfig.md#onretry)
- [retries](RetryConfig.md#retries)

## Properties

### <a id="backoffamount" name="backoffamount"></a> backoffAmount

• `Optional` **backoffAmount**: `number`

The amount to increase the delay by each retry (in ms)

**`Default`**

0

#### Defined in

[retryWrapper/retryWrapper.ts:17](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/retryWrapper/retryWrapper.ts#lines-17)

___

### <a id="delay" name="delay"></a> delay

• `Optional` **delay**: `number`

The base delay between retries (in ms)

**`Default`**

0

#### Defined in

[retryWrapper/retryWrapper.ts:12](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/retryWrapper/retryWrapper.ts#lines-12)

___

### <a id="onretry" name="onretry"></a> onRetry

• `Optional` **onRetry**: (`retries`: `number`, `error`: `Error`, `config`: [`RetryConfig`](RetryConfig.md)) => `void`

#### Type declaration

▸ (`retries`, `error`, `config`): `void`

A callback to run before each retry

##### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `retries` | `number` | the number of retries so far (will start at 1) |
| `error` | `Error` | the error from the last attempt |
| `config` | [`RetryConfig`](RetryConfig.md) | the configuration supplied to the retryWrapper |

##### Returns

`void`

#### Defined in

[retryWrapper/retryWrapper.ts:24](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/retryWrapper/retryWrapper.ts#lines-24)

___

### <a id="retries" name="retries"></a> retries

• `Optional` **retries**: `number`

The number of retries to attempt after the first run

**`Default`**

1

#### Defined in

[retryWrapper/retryWrapper.ts:7](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/retryWrapper/retryWrapper.ts#lines-7)
