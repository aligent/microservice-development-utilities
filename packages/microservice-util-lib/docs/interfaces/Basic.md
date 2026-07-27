[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / Basic

# Interface: Basic

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:42](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L42)

Represents basic authentication credentials.

This interface is used for basic authentication, where the username and password
can be provided statically or retrieved dynamically via a function.

 Basic

## Properties

<a id="credentials"></a>

### credentials

> **credentials**: `Resolvable`\<\{ `password`: `string`; `username`: `string`; \}\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:43](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L43)

The credentials, or a function returning them.
