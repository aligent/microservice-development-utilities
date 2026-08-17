import { Expression, ExpressionSet } from 'path-expression-matcher';
import { describe, expect, it } from 'vitest';
import { parseXmlResponse } from './parse-xml-response';

const expressions = new ExpressionSet();

const xml = '<Root><Value>1</Value></Root>';

/** Helper that invokes the middleware's `onResponse` hook with a given response. */
async function applyMiddleware(response: Response, expr?: ExpressionSet): Promise<Response> {
    const middleware = parseXmlResponse(expr ?? expressions);
    const { onResponse } = middleware;
    if (!onResponse) throw new Error('onResponse hook is missing');

    const result = await onResponse({
        response,
        request: new Request('https://example.com'),
        options: {},
    } as Parameters<typeof onResponse>[0]);
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

    it('passes through a 204 response with Content-Type: application/xml without throwing', async () => {
        const original = new Response(null, {
            status: 204,
            headers: { 'Content-Type': 'application/xml' },
        });

        const result = await applyMiddleware(original);

        expect(result.status).toBe(204);
        expect(result.body).toBeNull();
    });

    it('removes Content-Length and Content-Encoding from the converted response', async () => {
        const original = new Response(xml, {
            headers: {
                'Content-Type': 'application/xml',
                'Content-Length': '999',
                'Content-Encoding': 'gzip',
            },
        });

        const converted = await applyMiddleware(original);

        expect(converted.headers.get('Content-Type')).toBe('application/json');
        expect(converted.headers.has('Content-Length')).toBe(false);
        expect(converted.headers.has('Content-Encoding')).toBe(false);
    });

    it('passes through application/xhtml+xml responses unconverted', async () => {
        const xhtml =
            '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><body>Hi</body></html>';
        const original = new Response(xhtml, {
            headers: { 'Content-Type': 'application/xhtml+xml' },
        });

        const result = await applyMiddleware(original);

        expect(result.headers.get('Content-Type')).toBe('application/xhtml+xml');
        expect(await result.text()).toBe(xhtml);
    });

    it('converts text/xml content type', async () => {
        const converted = await applyMiddleware(
            new Response(xml, { headers: { 'Content-Type': 'text/xml' } })
        );

        expect(converted.headers.get('Content-Type')).toBe('application/json');
        expect(await converted.json()).toEqual({ Root: { Value: '1' } });
    });

    it('converts +xml subtypes like application/soap+xml', async () => {
        const soapXml = '<Envelope><Body>data</Body></Envelope>';
        const converted = await applyMiddleware(
            new Response(soapXml, {
                headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
            })
        );

        expect(converted.headers.get('Content-Type')).toBe('application/json');
        expect(await converted.json()).toEqual({ Envelope: { Body: 'data' } });
    });

    it('returns a single child element as an array when it matches an ExpressionSet', async () => {
        const expr = new ExpressionSet();
        expr.add(new Expression('Root.Items.Item'));

        const xmlWithSingleItem = '<Root><Items><Item>one</Item></Items></Root>';
        const converted = await applyMiddleware(
            new Response(xmlWithSingleItem, {
                headers: { 'Content-Type': 'application/xml' },
            }),
            expr
        );

        const json = (await converted.json()) as { Root: { Items: { Item: string[] } } };
        expect(json.Root.Items.Item).toEqual(['one']);
    });
});
