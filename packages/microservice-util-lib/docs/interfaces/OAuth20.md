[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / OAuth20

# Interface: OAuth20

Defined in: [openapi-fetch-middlewares/types/authentications.ts:68](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L68)

Represents OAuth 2.0 authentication credentials.

This interface is used for OAuth 2.0 authentication, where an access token is retrieved
asynchronously. It also supports an optional token type (e.g., 'Bearer').

 OAuth20

## Properties

<a id="token"></a>

### token()

> **token**: () => `Promise`\<`string`\>

Defined in: [openapi-fetch-middlewares/types/authentications.ts:69](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L69)

A function that returns a promise resolving to the access token.

#### Returns

`Promise`\<`string`\>

***

<a id="tokentype"></a>

### tokenType?

> `optional` **tokenType**: `string`

Defined in: [openapi-fetch-middlewares/types/authentications.ts:70](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L70)

The type of the token (e.g., 'Bearer'). Defaults to 'Bearer' if not specified.
