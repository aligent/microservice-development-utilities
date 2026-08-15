[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / ApiKey

# Interface: ApiKey

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:28](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L28)

Represents an API key authentication method.

This interface is used for API key-based authentication, where the key is sent
in a specific header. The value can be a static string or a function that returns one.

 ApiKey

## Properties

<a id="header"></a>

### header

> **header**: `string`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:29](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L29)

The header name where the API key will be set.

***

<a id="value"></a>

### value

> **value**: `Resolvable`\<`string`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts:30](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/openapi-fetch-middlewares/types/authentications.ts#L30)

The API key value, or a function returning it.
