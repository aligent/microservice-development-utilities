[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / createErrorThrowingClient

# Function: createErrorThrowingClient()

> **createErrorThrowingClient**\<`Paths`, `Media`\>(`options`): [`ErrorThrowingClient`](../interfaces/ErrorThrowingClient.md)\<`Paths`, `Media`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts:112](https://github.com/aligent/microservice-development-utilities/blob/9b108bd1d546cc33ffe07530fc02dfe4d839a9e0/packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts#L112)

Create an openapi-fetch client and cast it to an ErrorThrowingClient.

This is a convenience wrapper around createClient + asErrorThrowingClient.
The caller MUST register the throwOnNotOk() middleware
on the returned client for the type guarantee to hold at runtime.

WARNING: Do not use unless throwOnNotOk() is registered — without it a non-OK
response is returned rather than thrown, and the success-only type is a lie.

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
