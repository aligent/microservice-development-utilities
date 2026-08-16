[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / Logger

# Interface: Logger

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/log.ts:7](https://github.com/aligent/microservice-development-utilities/blob/3299b477c44ea5ded7c52690ed62a5aa48c95908/packages/microservice-util-lib/src/openapi-fetch-middlewares/log.ts#L7)

Logger interface to support various logging implementations
(console, winston, pino, bunyan, etc.)

## Methods

<a id="debug"></a>

### debug()?

> `optional` **debug**(`message`, ...`args`): `void`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/log.ts:9](https://github.com/aligent/microservice-development-utilities/blob/3299b477c44ea5ded7c52690ed62a5aa48c95908/packages/microservice-util-lib/src/openapi-fetch-middlewares/log.ts#L9)

#### Parameters

##### message

`string`

##### args

...`unknown`[]

#### Returns

`void`

***

<a id="info"></a>

### info()

> **info**(`message`, ...`args`): `void`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/log.ts:8](https://github.com/aligent/microservice-development-utilities/blob/3299b477c44ea5ded7c52690ed62a5aa48c95908/packages/microservice-util-lib/src/openapi-fetch-middlewares/log.ts#L8)

#### Parameters

##### message

`string`

##### args

...`unknown`[]

#### Returns

`void`
