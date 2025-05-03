[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / oAuth20AuthMiddleware

# Function: oAuth20AuthMiddleware()

> **oAuth20AuthMiddleware**(`options`): `Middleware`

Defined in: [openapi-fetch-middlewares/authentications.ts:94](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts#L94)

Creates an openapi-fetch middleware for OAuth 2.0 authentication.
This middleware sets the `Authorization` header with the OAuth 2.0 token for each request.

## Parameters

### options

[`OAuth20`](../interfaces/OAuth20.md)

The configuration for OAuth 2.0 authentication.

## Returns

`Middleware`

The middleware for OAuth 2.0 authentication.

## Example

```ts
const middleware = oAuth20AuthMiddleware({
    token: async () => 'your-access-token',
    tokenType: 'Bearer',
});
```
