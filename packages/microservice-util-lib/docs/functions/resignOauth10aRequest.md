[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / resignOauth10aRequest

# Function: resignOauth10aRequest()

> **resignOauth10aRequest**(`request`, `config`): `Promise`\<`Request`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/oauth10a/oauth10a.ts:343](https://github.com/aligent/microservice-development-utilities/blob/b0663196a9151bf212120e65463afd54a6c9e6a3/packages/microservice-util-lib/src/openapi-fetch-middlewares/oauth10a/oauth10a.ts#L343)

Standalone function that re-signs a `Request` with fresh OAuth 1.0a credentials.
This function derives all information (URL, method, query params, body)
directly from the `Request` object, without requiring openapi-fetch middleware context.

Designed for use with [retryFetch](retryFetch.md)'s `onRetry` hook to regenerate
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
const client = createClient({
    fetch: retryFetch({
        onRetry: ({ request }) => resignOauth10aRequest(request, config),
    }),
});
```
