[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / apiKeyAuthMiddleware

# Function: apiKeyAuthMiddleware()

> **apiKeyAuthMiddleware**(`config`): `Middleware`

Defined in: [openapi-fetch-middlewares/authentications.ts:18](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/openapi-fetch-middlewares/authentications.ts#L18)

Creates an openapi-fetch middleware for API key authentication.
This middleware sets the API key in the specified header for each request.

## Parameters

### config

[`ApiKey`](../interfaces/ApiKey.md)

The configuration for API key authentication.

## Returns

`Middleware`

The middleware for API key authentication.

## Example

```ts
const middleware = apiKeyAuthMiddleware({
    header: 'x-api-key',
    value: async () => 'your-api-key',
});
```
