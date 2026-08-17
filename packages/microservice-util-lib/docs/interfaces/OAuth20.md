[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / OAuth20

# Interface: OAuth20

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:86](https://github.com/aligent/microservice-development-utilities/blob/cd832d84246fb7f35100fa0dda063c453dfda731/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L86)

Represents OAuth 2.0 authentication credentials.

This interface is used for OAuth 2.0 authentication, where an access token can be
provided statically or retrieved dynamically via a function.
It also supports an optional token type (e.g., 'Bearer').

 OAuth20

## Properties

<a id="token"></a>

### token

> **token**: `Resolvable`\<`string`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:87](https://github.com/aligent/microservice-development-utilities/blob/cd832d84246fb7f35100fa0dda063c453dfda731/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L87)

The access token, or a function returning it.

***

<a id="tokentype"></a>

### tokenType?

> `optional` **tokenType?**: `string`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:88](https://github.com/aligent/microservice-development-utilities/blob/cd832d84246fb7f35100fa0dda063c453dfda731/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L88)

The type of the token (e.g., 'Bearer'). Defaults to 'Bearer' if not specified.
