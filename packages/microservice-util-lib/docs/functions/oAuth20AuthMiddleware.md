[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / oAuth20AuthMiddleware

# Function: oAuth20AuthMiddleware()

> **oAuth20AuthMiddleware**(`options`): `Middleware`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts:136](https://github.com/aligent/microservice-development-utilities/blob/746c97fa9b886159e6b3133925f205ce30b1e675/packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts#L136)

Creates an openapi-fetch middleware for OAuth 2.0 authentication.
This middleware sets the `Authorization` header with the OAuth 2.0 token for each request.

## Parameters

### options

[`OAuth20`](../interfaces/OAuth20.md)

The configuration for OAuth 2.0 authentication.

## Returns

`Middleware`

The middleware for OAuth 2.0 authentication.

## Examples

```ts
// Static token
const middleware = oAuth20AuthMiddleware({
    token: 'your-access-token',
    tokenType: 'Bearer',
});
```

```ts
// Dynamic token (async function)
const middleware = oAuth20AuthMiddleware({
    token: async () => fetchAccessToken(),
    tokenType: 'Bearer',
});
```
