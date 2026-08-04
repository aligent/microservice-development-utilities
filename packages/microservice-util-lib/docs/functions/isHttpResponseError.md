[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / isHttpResponseError

# Function: isHttpResponseError()

> **isHttpResponseError**\<`TBody`\>(`error`): `error is HttpResponseError<TBody>`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/utils/http-response-error.ts:157](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/utils/http-response-error.ts#L157)

Type guard to check if an error is an [HttpResponseError](../classes/HttpResponseError.md).
Useful for narrowing error types in catch blocks.

## Type Parameters

### TBody

`TBody` = `unknown`

Optional type parameter to narrow the response body.
  No runtime validation of the body shape is performed — this is purely
  a compile-time convenience for callers who know the expected body type.

## Parameters

### error

`unknown`

The error to check.

## Returns

`error is HttpResponseError<TBody>`

`true` if the error is an HttpResponseError.

## Example

```ts
try {
    await fetchData();
} catch (error) {
    if (isHttpResponseError(error)) {
        console.log(`Request failed with status ${error.status}`);
        console.log(`URL: ${error.request.url}`);
    }
}
```
