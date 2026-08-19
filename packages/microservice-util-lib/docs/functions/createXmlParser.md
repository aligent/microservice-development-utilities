[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / createXmlParser

# Function: createXmlParser()

> **createXmlParser**(`expressions?`): `XMLParser`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/parse-xml-response.ts:24](https://github.com/aligent/microservice-development-utilities/blob/039104d2966f94c9d0628f648b1827b63578171a/packages/microservice-util-lib/src/openapi-fetch-middlewares/parse-xml-response.ts#L24)

Builds the response XML parser.

The `isArray` callback consults the generated jPath expression set so that a
node the schema declares as an array stays an array even when the API returns a
single child element (XML has no native way to distinguish a one-element list
from a scalar).

Parser options:
- Attributes are prefixed with `@` to avoid collisions with child-element keys.
- `xmlns` / `xsi:` namespace attributes are stripped — they carry no domain data.
- The XML declaration (`<?xml … ?>`) is discarded.
- Tag text values are kept as raw strings (no implicit number/boolean coercion).
- Leading/trailing whitespace in text nodes is trimmed.

## Parameters

### expressions?

`ExpressionSet`

Optional set of jPath expressions identifying array nodes,
  typically generated from the OpenAPI spec via `generate-array-paths`.

## Returns

`XMLParser`

A configured XMLParser instance.
