[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / OAuth10a

# Interface: OAuth10a

Defined in: [openapi-fetch-middlewares/types/authentications.ts:44](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L44)

Represents OAuth 1.0a authentication credentials.

This interface is used for OAuth 1.0a authentication, where the consumer key, consumer secret,
token, and token secret are retrieved asynchronously. It also supports optional parameters
like body hash inclusion, realm, callback, and verifier.

 OAuth10a

## Properties

<a id="algorithm"></a>

### algorithm

> **algorithm**: `"HMAC-SHA1"` \| `"HMAC-SHA256"`

Defined in: [openapi-fetch-middlewares/types/authentications.ts:45](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L45)

The signing algorithm to use.

***

<a id="callback"></a>

### callback?

> `optional` **callback**: `string`

Defined in: [openapi-fetch-middlewares/types/authentications.ts:54](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L54)

The callback URL for OAuth 1.0a.

***

<a id="credentials"></a>

### credentials()

> **credentials**: () => `Promise`\<\{ `consumerKey`: `string`; `consumerSecret`: `string`; `token`: `string`; `tokenSecret`: `string`; \}\>

Defined in: [openapi-fetch-middlewares/types/authentications.ts:46](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L46)

A function that returns a promise resolving to the OAuth 1.0a credentials.

#### Returns

`Promise`\<\{ `consumerKey`: `string`; `consumerSecret`: `string`; `token`: `string`; `tokenSecret`: `string`; \}\>

***

<a id="includebodyhash"></a>

### includeBodyHash?

> `optional` **includeBodyHash**: `boolean` \| `"auto"`

Defined in: [openapi-fetch-middlewares/types/authentications.ts:52](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L52)

Whether to include a body hash in the signature. Defaults to 'auto'.

***

<a id="realm"></a>

### realm?

> `optional` **realm**: `string`

Defined in: [openapi-fetch-middlewares/types/authentications.ts:53](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L53)

The realm parameter for the Authorization header.

***

<a id="verifier"></a>

### verifier?

> `optional` **verifier**: `string`

Defined in: [openapi-fetch-middlewares/types/authentications.ts:55](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L55)

The verifier for OAuth 1.0a.
