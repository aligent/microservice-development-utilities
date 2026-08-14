import { ExpressionSet } from 'path-expression-matcher';
import { describe, expect, it } from 'vitest';
import { parseXmlResponse } from './parse-xml-response';

const expressions = new ExpressionSet();

const xml = '<Root><Value>1</Value></Root>';

/** Helper that invokes the middleware's `onResponse` hook with a given response. */
async function applyMiddleware(response: Response): Promise<Response> {
    const middleware = parseXmlResponse(expressions);
    const result = await middleware.onResponse!({
        response,
        request: new Request('https://example.com'),
        options: {},
    } as Parameters<NonNullable<typeof middleware.onResponse>>[0]);
    return (result as Response | undefined) ?? response;
}

describe('parseXmlResponse', () => {
    it('converts an XML body to JSON and marks the response as JSON', async () => {
        const converted = await applyMiddleware(
            new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
        );

        expect(converted.headers.get('Content-Type')).toBe('application/json');
        expect(await converted.json()).toEqual({ Root: { Value: '1' } });
    });

    it('preserves the status and status text, which retry and error classification read', async () => {
        const converted = await applyMiddleware(
            new Response('<Fault>busy</Fault>', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/xml' },
            })
        );

        expect(converted.status).toBe(503);
        expect(converted.statusText).toBe('Service Unavailable');
    });

    it('leaves an already-converted response untouched, so applying it twice is safe', async () => {
        const once = await applyMiddleware(
            new Response(xml, { headers: { 'Content-Type': 'application/xml' } })
        );
        const twice = await applyMiddleware(once);

        expect(await twice.json()).toEqual({ Root: { Value: '1' } });
    });

    it('passes through non-XML responses without modification', async () => {
        const html = '<html><body>Bad Gateway</body></html>';
        const original = new Response(html, {
            status: 502,
            headers: { 'Content-Type': 'text/html' },
        });

        const result = await applyMiddleware(original);

        expect(result.headers.get('Content-Type')).toBe('text/html');
        expect(await result.text()).toBe(html);
    });
});
