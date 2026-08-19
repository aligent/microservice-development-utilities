[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / Basic

# Interface: Basic

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:42](https://github.com/aligent/microservice-development-utilities/blob/b0663196a9151bf212120e65463afd54a6c9e6a3/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L42)

Represents basic authentication credentials.

This interface is used for basic authentication, where the username and password
can be provided statically or retrieved dynamically via a function.

 Basic

## Properties

<a id="credentials"></a>

### credentials

> **credentials**: `Resolvable`\<\{ `password`: `string`; `username`: `string`; \}\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:43](https://github.com/aligent/microservice-development-utilities/blob/b0663196a9151bf212120e65463afd54a6c9e6a3/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L43)

The credentials, or a function returning them.
