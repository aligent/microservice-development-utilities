[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / OAuth10a

# Interface: OAuth10a

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:61](https://github.com/aligent/microservice-development-utilities/blob/b0663196a9151bf212120e65463afd54a6c9e6a3/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L61)

Represents OAuth 1.0a authentication credentials.

This interface is used for OAuth 1.0a authentication, where the consumer key, consumer secret,
token, and token secret can be provided statically or retrieved dynamically via a function.
It also supports optional parameters like body hash inclusion, realm, callback, and verifier.

 OAuth10a

## Properties

<a id="algorithm"></a>

### algorithm

> **algorithm**: `"HMAC-SHA1"` \| `"HMAC-SHA256"`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:62](https://github.com/aligent/microservice-development-utilities/blob/b0663196a9151bf212120e65463afd54a6c9e6a3/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L62)

The signing algorithm to use.

***

<a id="callback"></a>

### callback?

> `optional` **callback?**: `string`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:71](https://github.com/aligent/microservice-development-utilities/blob/b0663196a9151bf212120e65463afd54a6c9e6a3/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L71)

The callback URL for OAuth 1.0a.

***

<a id="credentials"></a>

### credentials

> **credentials**: `Resolvable`\<\{ `consumerKey`: `string`; `consumerSecret`: `string`; `token?`: `string`; `tokenSecret`: `string`; \}\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:63](https://github.com/aligent/microservice-development-utilities/blob/b0663196a9151bf212120e65463afd54a6c9e6a3/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L63)

The OAuth 1.0a credentials, or a function returning them.

***

<a id="includebodyhash"></a>

### includeBodyHash?

> `optional` **includeBodyHash?**: `boolean` \| `"auto"`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:69](https://github.com/aligent/microservice-development-utilities/blob/b0663196a9151bf212120e65463afd54a6c9e6a3/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L69)

Whether to include a body hash in the signature. Defaults to 'auto'.

***

<a id="realm"></a>

### realm?

> `optional` **realm?**: `string`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:70](https://github.com/aligent/microservice-development-utilities/blob/b0663196a9151bf212120e65463afd54a6c9e6a3/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L70)

The realm parameter for the Authorization header.

***

<a id="verifier"></a>

### verifier?

> `optional` **verifier?**: `string`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:72](https://github.com/aligent/microservice-development-utilities/blob/b0663196a9151bf212120e65463afd54a6c9e6a3/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L72)

The verifier for OAuth 1.0a.
