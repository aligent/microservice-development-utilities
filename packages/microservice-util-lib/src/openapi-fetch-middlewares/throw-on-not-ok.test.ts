import createClient, { type Middleware } from 'openapi-fetch';
import { retryFetch } from '../retry-fetch/retry-fetch';
import { throwOnNotOk } from './throw-on-not-ok';
import { createErrorThrowingClient } from './throwing-client';
import { isHttpResponseError } from './utils/http-response-error';

interface paths {
    '/test': {
        get: { responses: { 200: { content: { 'application/json': { message: string } } } } };
    };
}

describe('throwOnNotOk', () => {
    const clientWith = (response: Response, ...middleware: Middleware[]) => {
        const client = createClient<paths>({
            baseUrl: 'https://api.example.com',
            fetch: vi.fn().mockResolvedValue(response) as typeof fetch,
        });
        client.use(...middleware);
        return client;
    };

    it('should throw an HttpResponseError for a non-ok response', async () => {
        const client = clientWith(
            new Response(JSON.stringify({ error: 'boom' }), {
                status: 500,
                statusText: 'Internal Server Error',
                headers: { 'Content-Type': 'application/json' },
            }),
            throwOnNotOk()
        );

        await expect(client.GET('/test')).rejects.toThrow('500: Internal Server Error');
    });

    it('should expose the failing response on the thrown error', async () => {
        const client = clientWith(
            new Response(JSON.stringify({ error: 'boom' }), {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
            }),
            throwOnNotOk()
        );

        const error = await client.GET('/test').catch((err: unknown) => err);

        expect(isHttpResponseError(error)).toBe(true);
    });

    it('should pass an ok response through untouched', async () => {
        const client = clientWith(
            new Response(JSON.stringify({ message: 'success' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }),
            throwOnNotOk()
        );

        const { data } = await client.GET('/test');

        expect(data).toEqual({ message: 'success' });
    });

    it('should let middleware registered after it observe the failing response before throwing', async () => {
        const observed: number[] = [];
        const observer = (): Middleware => ({
            onResponse({ response }) {
                observed.push(response.status);
            },
        });

        const client = clientWith(
            new Response(JSON.stringify({ error: 'boom' }), {
                status: 500,
                statusText: 'Internal Server Error',
                headers: { 'Content-Type': 'application/json' },
            }),
            throwOnNotOk(),
            observer()
        );

        await expect(client.GET('/test')).rejects.toThrow('500: Internal Server Error');
        expect(observed).toEqual([500]);
    });

    it('should uphold the createErrorThrowingClient contract when retries are exhausted', async () => {
        const inner = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ error: 'boom' }), {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
            })
        );

        const client = createErrorThrowingClient<paths>({
            baseUrl: 'https://api.example.com',
            fetch: retryFetch(inner as typeof fetch, { retries: 1, baseDelay: 10 }),
        });
        client.use(throwOnNotOk());

        await expect(client.GET('/test')).rejects.toThrow('503: Service Unavailable');
        expect(inner).toHaveBeenCalledTimes(2);
    });
});
