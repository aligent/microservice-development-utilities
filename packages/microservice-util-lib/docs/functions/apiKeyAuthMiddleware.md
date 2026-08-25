[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / apiKeyAuthMiddleware

# Function: apiKeyAuthMiddleware()

> **apiKeyAuthMiddleware**(`config`): `Middleware`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts:27](https://github.com/aligent/microservice-development-utilities/blob/bdd7e82de06e0611b27ae79005e5208ce3f07b51/packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts#L27)

Creates an openapi-fetch middleware for API key authentication.
This middleware sets the API key in the specified header for each request.

## Parameters

### config

[`ApiKey`](../interfaces/ApiKey.md)

The configuration for API key authentication.

## Returns

`Middleware`

The middleware for API key authentication.

## Examples

```ts
// Static value
const middleware = apiKeyAuthMiddleware({
    header: 'x-api-key',
    value: 'your-api-key',
});
```

```ts
// Dynamic value (async function)
const middleware = apiKeyAuthMiddleware({
    header: 'x-api-key',
    value: async () => fetchApiKey(),
});
```
