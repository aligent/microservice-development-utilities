[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / basicAuthMiddleware

# Function: basicAuthMiddleware()

> **basicAuthMiddleware**(`config`): `Middleware`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts:65](https://github.com/aligent/microservice-development-utilities/blob/cd832d84246fb7f35100fa0dda063c453dfda731/packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts#L65)

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
