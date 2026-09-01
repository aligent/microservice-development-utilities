[**@aligent/lambda-test-utils**](../modules.md)

***

[@aligent/lambda-test-utils](../modules.md) / invokeApiGatewayHandler

# Function: invokeApiGatewayHandler()

> **invokeApiGatewayHandler**(`handler`, `eventOverrides?`, `contextOverrides?`): `Promise`\<[`InvokedResponse`](../interfaces/InvokedResponse.md)\>

Defined in: invoke.ts:26

Invokes an API Gateway proxy handler with a built event/context and
resolves whichever completion path the handler uses — a returned promise
or the NodeJS-style callback.

## Parameters

### handler

`Handler`\<`APIGatewayProxyEvent`, `APIGatewayProxyResult`\>

### eventOverrides?

`Partial`\<`APIGatewayProxyEvent`\>

### contextOverrides?

`Partial`\<`Context`\>

## Returns

`Promise`\<[`InvokedResponse`](../interfaces/InvokedResponse.md)\>
