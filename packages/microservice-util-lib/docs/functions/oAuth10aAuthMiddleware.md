[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / oAuth10aAuthMiddleware

# Function: oAuth10aAuthMiddleware()

> **oAuth10aAuthMiddleware**(`config`): `Middleware`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts:105](https://github.com/aligent/microservice-development-utilities/blob/9b108bd1d546cc33ffe07530fc02dfe4d839a9e0/packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts#L105)

Creates an openapi-fetch middleware for OAuth 1.0a authentication.
This middleware generates OAuth 1.0a parameters and sets the `Authorization` header
for each request.

## Parameters

### config

[`OAuth10a`](../interfaces/OAuth10a.md)

The configuration for OAuth 1.0a authentication.

## Returns

`Middleware`

The middleware for OAuth 1.0a authentication.

## Examples

```ts
// Static credentials
const middleware = oAuth10aAuthMiddleware({
    algorithm: 'HMAC-SHA256',
    credentials: {
        consumerKey: 'key',
        consumerSecret: 'secret',
        token: 'token',
        tokenSecret: 'tokenSecret',
    },
});
```

```ts
// Dynamic credentials (async function)
const middleware = oAuth10aAuthMiddleware({
    algorithm: 'HMAC-SHA256',
    credentials: async () => fetchOAuthCredentials(),
});
```
