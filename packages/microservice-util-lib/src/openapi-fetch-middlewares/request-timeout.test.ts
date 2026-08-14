import createClient from 'openapi-fetch';
import { describe, expect, it } from 'vitest';
import { requestTimeout } from './request-timeout';

interface paths {
    '/test': {
        get: { responses: { 200: { content: { 'application/json': { message: string } } } } };
    };
}


describe('requestTimeout', () => {
    it('should attach a timeout signal to the request', async () => {
        const fetchFn = vi
            .fn()
            .mockResolvedValue(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }));

        const client = createClient<paths>({
            baseUrl: 'https://api.example.com',
            fetch: fetchFn as typeof fetch,
        });
        client.use(requestTimeout(5000));

        const { data } = await client.GET('/test');

        expect(data).toEqual({ message: 'ok' });
    });

    it('should abort the request when the timeout expires', async () => {
        const middleware = requestTimeout(50);
        const request = new Request('https://api.example.com/test');

        const result = await middleware.onRequest!({
            request,
            options: {},
        } as Parameters<NonNullable<typeof middleware.onRequest>>[0]);

        const timedRequest = result as Request;
        expect(timedRequest.signal).toBeDefined();

        // Wait for the timeout to fire
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(timedRequest.signal.aborted).toBe(true);
    });

    it.each([0, -1, -100])(
        'should pass through the request unchanged for non-positive value %d',
        async ms => {
            const fetchFn = vi
                .fn()
                .mockResolvedValue(
                    new Response(JSON.stringify({ message: 'ok' }), { status: 200 })
                );

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: fetchFn as typeof fetch,
            });
            client.use(requestTimeout(ms));

            const { data } = await client.GET('/test');

            expect(data).toEqual({ message: 'ok' });
        }
    );

    it.each([NaN, Infinity])('should pass through the request unchanged for %s', async ms => {
        const fetchFn = vi
            .fn()
            .mockResolvedValue(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }));

        const client = createClient<paths>({
            baseUrl: 'https://api.example.com',
            fetch: fetchFn as typeof fetch,
        });
        client.use(requestTimeout(ms));

        const { data } = await client.GET('/test');

        expect(data).toEqual({ message: 'ok' });
    });
});
