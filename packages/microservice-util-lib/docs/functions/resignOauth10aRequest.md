[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / resignOauth10aRequest

# Function: resignOauth10aRequest()

> **resignOauth10aRequest**(`request`, `config`): `Promise`\<`Request`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/oauth10a/oauth10a.ts:292](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/oauth10a/oauth10a.ts#L292)

Standalone function that re-signs a `Request` with fresh OAuth 1.0a credentials.
This function derives all information (URL, method, query params, body)
directly from the `Request` object, without requiring openapi-fetch middleware context.

Designed for use with the retry middleware's `onRetry` hook to regenerate
OAuth 1.0a signatures on retried requests.

## Parameters

### request

`Request`

The request to re-sign.

### config

[`OAuth10a`](../interfaces/OAuth10a.md)

The OAuth 1.0a configuration.

## Returns

`Promise`\<`Request`\>

The request with a fresh `Authorization` header.

## Example

```ts
client.use(retryMiddleware({
    onRetry: ({ request }) => resignOauth10aRequest(request, config),
}));
```
