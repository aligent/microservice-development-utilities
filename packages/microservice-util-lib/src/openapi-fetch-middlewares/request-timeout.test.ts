import createClient from 'openapi-fetch';
import { describe, expect, it } from 'vitest';
import { requestTimeout } from './request-timeout';

interface paths {
    '/test': {
        get: { responses: { 200: { content: { 'application/json': { message: string } } } } };
    };
}

describe('requestTimeout', () => {
    it('should attach a timeout AbortSignal to the request', async () => {
        const fetchFn = vi
            .fn()
            .mockResolvedValue(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }));

        const client = createClient<paths>({
            baseUrl: 'https://api.example.com',
            fetch: fetchFn as typeof fetch,
        });
        client.use(requestTimeout(5000));

        await client.GET('/test');

        const sentRequest = fetchFn.mock.calls.at(0)?.at(0) as Request | undefined;
        if (!sentRequest) throw new Error('fetch was not called');
        expect(sentRequest.signal).toBeInstanceOf(AbortSignal);
    });

    it('should abort the request when the timeout expires', async () => {
        const middleware = requestTimeout(50);
        const { onRequest } = middleware;
        if (!onRequest) throw new Error('onRequest hook is missing');

        const request = new Request('https://api.example.com/test');
        const result = (await onRequest({
            request,
            options: {},
        } as Parameters<typeof onRequest>[0])) as Request;

        expect(result.signal).toBeInstanceOf(AbortSignal);
        expect(result.signal.aborted).toBe(false);

        // Wait for the platform timeout to fire
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(result.signal.aborted).toBe(true);
    });

    it('should compose the timeout signal with an existing caller signal', async () => {
        const middleware = requestTimeout(5000);
        const { onRequest } = middleware;
        if (!onRequest) throw new Error('onRequest hook is missing');

        const callerAbort = new AbortController();
        const request = new Request('https://api.example.com/test', {
            signal: callerAbort.signal,
        });

        const result = (await onRequest({
            request,
            options: {},
        } as Parameters<typeof onRequest>[0])) as Request;

        expect(result.signal.aborted).toBe(false);

        // Aborting the caller signal should abort the composed signal
        callerAbort.abort('user cancelled');
        expect(result.signal.aborted).toBe(true);
    });

    it('should abort the composed signal when the timeout fires before the caller signal', async () => {
        const middleware = requestTimeout(50);
        const { onRequest } = middleware;
        if (!onRequest) throw new Error('onRequest hook is missing');

        const callerAbort = new AbortController();
        const request = new Request('https://api.example.com/test', {
            signal: callerAbort.signal,
        });

        const result = (await onRequest({
            request,
            options: {},
        } as Parameters<typeof onRequest>[0])) as Request;

        expect(result.signal.aborted).toBe(false);

        // Wait for the platform timeout to fire
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(result.signal.aborted).toBe(true);
    });

    it.each([0, -1, -100, NaN, Infinity])('should throw a RangeError for invalid value %s', ms => {
        expect(() => requestTimeout(ms)).toThrow(RangeError);
    });
});
