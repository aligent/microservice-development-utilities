[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / basicAuthMiddleware

# Function: basicAuthMiddleware()

> **basicAuthMiddleware**(`config`): `Middleware`

Defined in: [openapi-fetch-middlewares/authentications.ts:39](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts#L39)

Creates an openapi-fetch middleware for Basic authentication.
This middleware sets the `Authorization` header with the Basic authentication credentials
(username and password) for each request.

## Parameters

### config

[`Basic`](../interfaces/Basic.md)

The configuration for Basic authentication.

## Returns

`Middleware`

The middleware for Basic authentication.

## Example

```ts
const middleware = basicAuthMiddleware({
    credentials: async () => ({ username: 'user', password: 'pass' }),
});
```
