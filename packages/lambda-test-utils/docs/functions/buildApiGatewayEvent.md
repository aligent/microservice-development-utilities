[**@aligent/lambda-test-utils**](../modules.md)

***

[@aligent/lambda-test-utils](../modules.md) / buildApiGatewayEvent

# Function: buildApiGatewayEvent()

> **buildApiGatewayEvent**(`overrides?`): `APIGatewayProxyEvent`

Defined in: event.ts:48

Builds a valid APIGatewayProxyEvent with sensible defaults for a
REST API proxy integration. `overrides` is deep-merged onto the defaults,
so a partial `requestContext` or `headers` override doesn't drop sibling
default fields.

## Parameters

### overrides?

`Partial`\<`APIGatewayProxyEvent`\>

## Returns

`APIGatewayProxyEvent`
