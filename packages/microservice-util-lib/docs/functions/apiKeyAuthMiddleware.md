[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / apiKeyAuthMiddleware

# Function: apiKeyAuthMiddleware()

> **apiKeyAuthMiddleware**(`config`): `Middleware`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts:37](https://github.com/aligent/microservice-development-utilities/blob/039104d2966f94c9d0628f648b1827b63578171a/packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts#L37)

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
