[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / OAuth20

# Interface: OAuth20

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:86](https://github.com/aligent/microservice-development-utilities/blob/2924feaebbc12f9d81d6c8e146827daf51044cc9/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L86)

Represents OAuth 2.0 authentication credentials.

This interface is used for OAuth 2.0 authentication, where an access token can be
provided statically or retrieved dynamically via a function.
It also supports an optional token type (e.g., 'Bearer').

 OAuth20

## Properties

<a id="token"></a>

### token

> **token**: `Resolvable`\<`string`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:87](https://github.com/aligent/microservice-development-utilities/blob/2924feaebbc12f9d81d6c8e146827daf51044cc9/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L87)

The access token, or a function returning it.

***

<a id="tokentype"></a>

### tokenType?

> `optional` **tokenType?**: `string`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:88](https://github.com/aligent/microservice-development-utilities/blob/2924feaebbc12f9d81d6c8e146827daf51044cc9/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L88)

The type of the token (e.g., 'Bearer'). Defaults to 'Bearer' if not specified.
