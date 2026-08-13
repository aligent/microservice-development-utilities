[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / basicAuthMiddleware

# Function: basicAuthMiddleware()

> **basicAuthMiddleware**(`config`): `Middleware`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts:65](https://github.com/aligent/microservice-development-utilities/blob/2924feaebbc12f9d81d6c8e146827daf51044cc9/packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts#L65)

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

## Examples

```ts
// Static credentials
const middleware = basicAuthMiddleware({
    credentials: { username: 'user', password: 'pass' },
});
```

```ts
// Dynamic credentials (async function)
const middleware = basicAuthMiddleware({
    credentials: async () => fetchCredentials(),
});
```
