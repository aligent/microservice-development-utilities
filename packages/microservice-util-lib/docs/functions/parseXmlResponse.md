[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / parseXmlResponse

# Function: parseXmlResponse()

> **parseXmlResponse**(`expressions?`): `Middleware`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/parse-xml-response.ts:60](https://github.com/aligent/microservice-development-utilities/blob/b0663196a9151bf212120e65463afd54a6c9e6a3/packages/microservice-util-lib/src/openapi-fetch-middlewares/parse-xml-response.ts#L60)

Creates an `openapi-fetch` middleware that transparently converts XML responses
to JSON, so every layer downstream of the transport works with a single body
format.

Only responses whose `Content-Type` is `application/xml`, `text/xml`, or a
subtype ending with `+xml` are converted. `application/xhtml+xml` is
explicitly excluded to avoid mangling XHTML pages. All other responses
(JSON, HTML, plain text, missing header) are returned untouched, so non-XML
error pages from load balancers or proxies pass through unmangled.

## Parameters

### expressions?

`ExpressionSet`

Optional jPath expression set forwarded to
  [createXmlParser](createXmlParser.md) for array-node detection.

## Returns

`Middleware`

An `openapi-fetch` Middleware with an `onResponse` hook.
