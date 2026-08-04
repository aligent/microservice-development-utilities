[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / createErrorThrowingClient

# Function: createErrorThrowingClient()

> **createErrorThrowingClient**\<`Paths`, `Media`\>(`options`): [`ErrorThrowingClient`](../interfaces/ErrorThrowingClient.md)\<`Paths`, `Media`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts:111](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts#L111)

Create an openapi-fetch client and cast it to an ErrorThrowingClient.

This is a convenience wrapper around createClient + asErrorThrowingClient.
The caller MUST register retryMiddleware (with default throwOnNotOk: true)
on the returned client for the type guarantee to hold at runtime.

WARNING: Do not use if retryMiddleware is configured with throwOnNotOk: false.

## Type Parameters

### Paths

`Paths` *extends* `object`

### Media

`Media` *extends* `` `${string}/${string}` `` = `` `${string}/${string}` ``

## Parameters

### options

[`ClientOptions`](../interfaces/ClientOptions.md)

## Returns

[`ErrorThrowingClient`](../interfaces/ErrorThrowingClient.md)\<`Paths`, `Media`\>
