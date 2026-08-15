[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / throwOnNotOk

# Function: throwOnNotOk()

> **throwOnNotOk**(): `Middleware`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/throw-on-not-ok.ts:20](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/openapi-fetch-middlewares/throw-on-not-ok.ts#L20)

Throws an [HttpResponseError](../classes/HttpResponseError.md) when a response has a non-OK status (i.e. not 2xx).

Register this when the caller should handle failures as exceptions rather than
inspecting `error` on the returned union — notably when using
`createErrorThrowingClient`, whose type guarantee depends on it.

openapi-fetch runs `onResponse` in reverse registration order, so middleware
registered *after* this one still observes the failing response before the throw:

## Returns

`Middleware`

The middleware for throwing on non-OK responses.

## Example

```ts
// logMiddleware logs the 500, then throwOnNotOk raises it to the caller
client.use(throwOnNotOk(), logMiddleware('MyApi'));
```
