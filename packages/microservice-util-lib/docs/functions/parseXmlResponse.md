[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / parseXmlResponse

# Function: parseXmlResponse()

> **parseXmlResponse**(`expressions?`): `Middleware`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/parse-xml-response.ts:52](https://github.com/aligent/microservice-development-utilities/blob/039104d2966f94c9d0628f648b1827b63578171a/packages/microservice-util-lib/src/openapi-fetch-middlewares/parse-xml-response.ts#L52)

Creates an `openapi-fetch` middleware that transparently converts XML responses
to JSON, so every layer downstream of the transport works with a single body
format.

Only responses whose `Content-Type` contains `xml` are converted. All other
responses (JSON, HTML, plain text, missing header) are returned untouched, so
non-XML error pages from load balancers or proxies pass through unmangled.

## Parameters

### expressions?

`ExpressionSet`

Optional jPath expression set forwarded to
  [createXmlParser](createXmlParser.md) for array-node detection.

## Returns

`Middleware`

An `openapi-fetch` Middleware with an `onResponse` hook.
