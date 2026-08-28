[**@aligent/lambda-test-utils**](../modules.md)

***

[@aligent/lambda-test-utils](../modules.md) / withJsonBody

# Function: withJsonBody()

> **withJsonBody**(`event`, `body`): `Partial`\<`APIGatewayProxyEvent`\>

Defined in: event.ts:73

Sets a JSON-stringified `body` and the matching `content-type` header on
an event (or partial event overrides destined for [buildApiGatewayEvent](buildApiGatewayEvent.md)).

## Parameters

### event

`Partial`\<`APIGatewayProxyEvent`\>

### body

`unknown`

## Returns

`Partial`\<`APIGatewayProxyEvent`\>
