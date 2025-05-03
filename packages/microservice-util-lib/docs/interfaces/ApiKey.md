[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / ApiKey

# Interface: ApiKey

Defined in: [openapi-fetch-middlewares/types/authentications.ts:11](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L11)

Represents an API key authentication method.

This interface is used for API key-based authentication, where the key is sent
in a specific header. The value of the API key is retrieved asynchronously.

 ApiKey

## Properties

<a id="header"></a>

### header

> **header**: `string`

Defined in: [openapi-fetch-middlewares/types/authentications.ts:12](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L12)

The header name where the API key will be set.

***

<a id="value"></a>

### value()

> **value**: () => `Promise`\<`string`\>

Defined in: [openapi-fetch-middlewares/types/authentications.ts:13](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L13)

A function that returns a promise resolving to the API key value.

#### Returns

`Promise`\<`string`\>
