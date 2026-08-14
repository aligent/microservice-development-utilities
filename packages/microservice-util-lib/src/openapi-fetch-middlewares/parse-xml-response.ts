import { XMLParser } from 'fast-xml-parser';
import { Middleware } from 'openapi-fetch';
import type { ExpressionSet, MatcherView } from 'path-expression-matcher';

/**
 * Builds the response XML parser.
 *
 * The `isArray` callback consults the generated jPath expression set so that a
 * node the schema declares as an array stays an array even when the API returns a
 * single child element (XML has no native way to distinguish a one-element list
 * from a scalar).
 *
 * Parser options:
 * - Attributes are prefixed with `@` to avoid collisions with child-element keys.
 * - `xmlns` / `xsi:` namespace attributes are stripped — they carry no domain data.
 * - The XML declaration (`<?xml … ?>`) is discarded.
 * - Tag text values are kept as raw strings (no implicit number/boolean coercion).
 * - Leading/trailing whitespace in text nodes is trimmed.
 *
 * @param expressions - Optional set of jPath expressions identifying array nodes,
 *   typically generated from the OpenAPI spec via `generate-array-paths`.
 * @returns A configured {@link XMLParser} instance.
 */
export function createXmlParser(expressions?: ExpressionSet): XMLParser {
    return new XMLParser({
        attributeNamePrefix: '@',
        ignoreAttributes: [/^xmlns/, /^xsi:/],
        ignoreDeclaration: true,
        parseTagValue: false,
        trimValues: true,
        jPath: false,
        isArray: (_tagName, matcher, _isLeafNode, isAttribute) => {
            if (isAttribute || !expressions) return false;
            return expressions.matchesAny(matcher as MatcherView);
        },
    });
}

/**
 * Creates an `openapi-fetch` middleware that transparently converts XML responses
 * to JSON, so every layer downstream of the transport works with a single body
 * format.
 *
 * Only responses whose `Content-Type` contains `xml` are converted. All other
 * responses (JSON, HTML, plain text, missing header) are returned untouched, so
 * non-XML error pages from load balancers or proxies pass through unmangled.
 *
 * @param expressions - Optional jPath expression set forwarded to
 *   {@link createXmlParser} for array-node detection.
 * @returns An `openapi-fetch` {@link Middleware} with an `onResponse` hook.
 */
export function parseXmlResponse(expressions?: ExpressionSet): Middleware {
    return {
        onResponse: async ({ response }) => {
            const headers = new Headers(response.headers);
            if (!headers.get('Content-Type')?.includes('xml')) return response;

            const { status, statusText } = response;
            headers.set('Content-Type', 'application/json');

            const text = await response.text();
            const body = JSON.stringify(createXmlParser(expressions).parse(text));

            return new Response(body, { headers, status, statusText });
        },
    };
}
