[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / oAuth10aAuthMiddleware

# Function: oAuth10aAuthMiddleware()

> **oAuth10aAuthMiddleware**(`config`): `Middleware`

Defined in: [openapi-fetch-middlewares/authentications.ts:71](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts#L71)

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

## Example

```ts
const middleware = oAuth10aAuthMiddleware({
    algorithm: 'HMAC-SHA256',
    credentials: async () => ({
        consumerKey: 'key',
        consumerSecret: 'secret',
        token: 'token',
        tokenSecret: 'tokenSecret',
    }),
});
```
