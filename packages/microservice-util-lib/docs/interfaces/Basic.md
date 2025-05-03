[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / Basic

# Interface: Basic

Defined in: [openapi-fetch-middlewares/types/authentications.ts:25](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L25)

Represents basic authentication credentials.

This interface is used for basic authentication, where the username and password
are retrieved asynchronously.

 Basic

## Properties

<a id="credentials"></a>

### credentials()

> **credentials**: () => `Promise`\<\{ `password`: `string`; `username`: `string`; \}\>

Defined in: [openapi-fetch-middlewares/types/authentications.ts:26](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L26)

A function that returns a promise resolving to the username and password.

#### Returns

`Promise`\<\{ `password`: `string`; `username`: `string`; \}\>
