[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / requestTimeout

# Function: requestTimeout()

> **requestTimeout**(`timeoutMs`): `Middleware`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/request-timeout.ts:9](https://github.com/aligent/microservice-development-utilities/blob/9b108bd1d546cc33ffe07530fc02dfe4d839a9e0/packages/microservice-util-lib/src/openapi-fetch-middlewares/request-timeout.ts#L9)

Middleware that applies a timeout to each request using `AbortSignal.timeout`.

## Parameters

### timeoutMs

`number`

Maximum time in milliseconds before the request is aborted.

## Returns

`Middleware`

A middleware that attaches a timeout signal to the request.
