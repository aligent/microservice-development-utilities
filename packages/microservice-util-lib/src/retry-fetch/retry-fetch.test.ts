import createClient, { type Middleware } from 'openapi-fetch';
import { retryFetch } from './retry-fetch';

interface paths {
    '/test': {
        get: { responses: { 200: { content: { 'application/json': { wrapped: string } } } } };
    };
}

describe('retryFetch', () => {
    afterEach(() => {
        // Without this, a second vi.spyOn(globalThis, 'fetch') reuses the existing spy
        // and call counts accumulate across tests.
        vi.restoreAllMocks();
    });

    it('should retry a retryable status and return the successful response', async () => {
        const inner = vi
            .fn()
            .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
            .mockResolvedValueOnce(new Response('ok', { status: 200 }));

        const fetchWithRetry = retryFetch(inner as typeof fetch, { retries: 2, baseDelay: 10 });

        const response = await fetchWithRetry(new Request('https://api.example.com/test'));

        expect(response.status).toBe(200);
        expect(await response.text()).toBe('ok');
        expect(inner).toHaveBeenCalledTimes(2);
    });

    describe('when no fetch implementation is given', () => {
        it('should use the global fetch', async () => {
            const globalFetch = vi
                .spyOn(globalThis, 'fetch')
                .mockResolvedValue(new Response('ok', { status: 200 }));

            const response = await retryFetch()(new Request('https://api.example.com/test'));

            expect(response.status).toBe(200);
            expect(globalFetch).toHaveBeenCalledTimes(1);
        });

        it('should resolve the global fetch per call, not when it was constructed', async () => {
            // Built before the spy exists. Capturing globalThis.fetch eagerly here is the
            // same defect retryMiddleware had: a fetch patched later is silently bypassed.
            const fetchWithRetry = retryFetch({ retries: 1, baseDelay: 10 });

            const globalFetch = vi
                .spyOn(globalThis, 'fetch')
                .mockResolvedValue(new Response('ok', { status: 200 }));

            await fetchWithRetry(new Request('https://api.example.com/test'));

            expect(globalFetch).toHaveBeenCalledTimes(1);
        });

        it('should accept a possibly-undefined fetch, as ClientOptions.fetch is optional', async () => {
            const globalFetch = vi
                .spyOn(globalThis, 'fetch')
                .mockResolvedValue(new Response('ok', { status: 200 }));
            const options: { fetch?: typeof fetch } = {};

            const response = await retryFetch(options.fetch)(
                new Request('https://api.example.com/test')
            );

            expect(response.status).toBe(200);
            expect(globalFetch).toHaveBeenCalledTimes(1);
        });

        it('should accept config as the only argument', async () => {
            const globalFetch = vi
                .spyOn(globalThis, 'fetch')
                .mockResolvedValue(new Response('nope', { status: 503 }));

            await retryFetch({ retries: 2, baseDelay: 1 })(
                new Request('https://api.example.com/test')
            );

            expect(globalFetch).toHaveBeenCalledTimes(3);
        });
    });

    it('should return a non-ok response rather than throwing', async () => {
        const inner = vi.fn().mockResolvedValue(new Response('nope', { status: 404 }));

        const fetchWithRetry = retryFetch(inner as typeof fetch, { retries: 2, baseDelay: 10 });
        const response = await fetchWithRetry(new Request('https://api.example.com/test'));

        expect(response.status).toBe(404);
        expect(inner).toHaveBeenCalledTimes(1);
    });

    it('should let response-transforming middleware see retried responses', async () => {
        const transform = (): Middleware => ({
            async onResponse({ response }) {
                return new Response(JSON.stringify({ wrapped: await response.text() }), {
                    status: response.status,
                    headers: { 'Content-Type': 'application/json' },
                });
            },
        });

        const inner = vi
            .fn()
            .mockResolvedValueOnce(new Response('first', { status: 503 }))
            .mockResolvedValueOnce(new Response('second', { status: 200 }));

        const client = createClient<paths>({
            baseUrl: 'https://api.example.com',
            fetch: retryFetch(inner as typeof fetch, { retries: 1, baseDelay: 10 }),
        });
        client.use(transform());

        const { data } = await client.GET('/test');

        expect(data).toEqual({ wrapped: 'second' });
    });

    it('should retry network errors', async () => {
        const inner = vi
            .fn()
            .mockRejectedValueOnce(new TypeError('fetch failed'))
            .mockResolvedValueOnce(new Response('ok', { status: 200 }));

        const fetchWithRetry = retryFetch(inner as typeof fetch, { retries: 2, baseDelay: 10 });

        const response = await fetchWithRetry(new Request('https://api.example.com/test'));

        expect(response.status).toBe(200);
        expect(inner).toHaveBeenCalledTimes(2);
    });

    it('should rethrow a network error once retries are exhausted', async () => {
        const inner = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

        const fetchWithRetry = retryFetch(inner as typeof fetch, { retries: 1, baseDelay: 10 });

        await expect(fetchWithRetry(new Request('https://api.example.com/test'))).rejects.toThrow(
            'fetch failed'
        );
        expect(inner).toHaveBeenCalledTimes(2);
    });

    it('should forward the second fetch argument on every attempt', async () => {
        const inner = vi
            .fn()
            .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
            .mockResolvedValueOnce(new Response('ok', { status: 200 }));
        // Stands in for openapi-fetch's requestInitExt, which carries host-specific
        // options such as an undici dispatcher.
        const requestInitExt = { dispatcher: 'proxy-agent' } as unknown as RequestInit;

        const fetchWithRetry = retryFetch(inner as typeof fetch, { retries: 1, baseDelay: 10 });

        await fetchWithRetry(new Request('https://api.example.com/test'), requestInitExt);

        expect(inner).toHaveBeenCalledTimes(2);
        expect(inner.mock.calls[0]?.[1]).toBe(requestInitExt);
        expect(inner.mock.calls[1]?.[1]).toBe(requestInitExt);
    });

    it('should retry a request that carries a body', async () => {
        const bodies: string[] = [];
        // Reads the body like a real fetch does, so a reused Request surfaces as a
        // consumed stream rather than passing silently.
        const inner = vi.fn(async (request: Request) => {
            bodies.push(await request.text());
            return new Response('unavailable', { status: bodies.length === 1 ? 503 : 200 });
        });

        const fetchWithRetry = retryFetch(inner as unknown as typeof fetch, {
            retries: 1,
            baseDelay: 10,
        });

        const response = await fetchWithRetry(
            new Request('https://api.example.com/test', {
                method: 'PUT',
                body: JSON.stringify({ hello: 'world' }),
            })
        );

        expect(response.status).toBe(200);
        expect(bodies).toEqual([
            JSON.stringify({ hello: 'world' }),
            JSON.stringify({ hello: 'world' }),
        ]);
    });

    describe('onRetry', () => {
        it('should not be called for the initial attempt', async () => {
            const onRetry = vi.fn();
            const inner = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));

            const fetchWithRetry = retryFetch(inner as typeof fetch, {
                retries: 2,
                baseDelay: 10,
                onRetry,
            });
            await fetchWithRetry(new Request('https://api.example.com/test'));

            expect(onRetry).not.toHaveBeenCalled();
        });

        it('should receive the attempt, the response that triggered the retry, and the request', async () => {
            const onRetry = vi.fn();
            const inner = vi
                .fn()
                .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
                .mockResolvedValueOnce(new Response('ok', { status: 200 }));

            const fetchWithRetry = retryFetch(inner as typeof fetch, {
                retries: 2,
                baseDelay: 10,
                onRetry,
            });
            await fetchWithRetry(new Request('https://api.example.com/test'));

            expect(onRetry).toHaveBeenCalledTimes(1);
            expect(onRetry).toHaveBeenCalledWith(
                expect.objectContaining({
                    attempt: 1,
                    request: expect.any(Request),
                    response: expect.any(Response),
                    error: null,
                })
            );
        });

        it('should use a Request returned by onRetry for the next attempt', async () => {
            const inner = vi
                .fn()
                .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
                .mockResolvedValueOnce(new Response('ok', { status: 200 }));

            const fetchWithRetry = retryFetch(inner as typeof fetch, {
                retries: 2,
                baseDelay: 10,
                onRetry: ({ request }) => {
                    const resigned = new Request(request);
                    resigned.headers.set('X-Resigned', 'yes');
                    return resigned;
                },
            });
            await fetchWithRetry(new Request('https://api.example.com/test'));

            const first = inner.mock.calls[0]?.[0] as Request;
            const retried = inner.mock.calls[1]?.[0] as Request;
            expect(first.headers.get('X-Resigned')).toBeNull();
            expect(retried.headers.get('X-Resigned')).toBe('yes');
        });

        it('should let onRetry read the request body without breaking the retry', async () => {
            const bodies: string[] = [];
            const inner = vi.fn(async (request: Request) => {
                bodies.push(await request.text());
                return new Response('x', { status: bodies.length === 1 ? 503 : 200 });
            });

            const fetchWithRetry = retryFetch(inner as unknown as typeof fetch, {
                retries: 1,
                baseDelay: 10,
                // Stands in for HMAC-over-body re-signing, which the README recommends.
                onRetry: async ({ request }) => {
                    await request.text();
                },
            });

            const response = await fetchWithRetry(
                new Request('https://api.example.com/test', { method: 'PUT', body: 'payload' })
            );

            expect(response.status).toBe(200);
            expect(bodies).toEqual(['payload', 'payload']);
        });

        it('should stop waiting out the backoff once the request is aborted', async () => {
            const controller = new AbortController();
            const inner = vi.fn().mockResolvedValue(new Response('x', { status: 503 }));

            const fetchWithRetry = retryFetch(inner as typeof fetch, {
                retries: 1,
                baseDelay: 5000,
            });

            const startedAt = performance.now();
            setTimeout(() => controller.abort(), 20);
            await fetchWithRetry(
                new Request('https://api.example.com/test', { signal: controller.signal })
            ).catch(() => undefined);

            expect(performance.now() - startedAt).toBeLessThan(1000);
        });

        it('should report the network error that triggered the retry', async () => {
            const onRetry = vi.fn();
            const inner = vi
                .fn()
                .mockRejectedValueOnce(new TypeError('fetch failed'))
                .mockResolvedValueOnce(new Response('ok', { status: 200 }));

            const fetchWithRetry = retryFetch(inner as typeof fetch, {
                retries: 2,
                baseDelay: 10,
                onRetry,
            });
            await fetchWithRetry(new Request('https://api.example.com/test'));

            expect(onRetry).toHaveBeenCalledWith(
                expect.objectContaining({
                    attempt: 1,
                    response: null,
                    error: expect.any(TypeError),
                })
            );
        });
    });

    describe('retry conditions', () => {
        const unavailable = () => new Response('unavailable', { status: 503 });

        it('should not retry non-idempotent methods by default', async () => {
            const inner = vi.fn().mockResolvedValue(unavailable());

            const fetchWithRetry = retryFetch(inner as typeof fetch, { retries: 2, baseDelay: 10 });
            const response = await fetchWithRetry(
                new Request('https://api.example.com/test', { method: 'POST' })
            );

            expect(response.status).toBe(503);
            expect(inner).toHaveBeenCalledTimes(1);
        });

        it('should retry non-idempotent methods when idempotentOnly is false', async () => {
            const inner = vi
                .fn()
                .mockResolvedValueOnce(unavailable())
                .mockResolvedValueOnce(new Response('ok', { status: 200 }));

            const fetchWithRetry = retryFetch(inner as typeof fetch, {
                retries: 2,
                baseDelay: 10,
                idempotentOnly: false,
            });
            const response = await fetchWithRetry(
                new Request('https://api.example.com/test', { method: 'POST' })
            );

            expect(response.status).toBe(200);
            expect(inner).toHaveBeenCalledTimes(2);
        });

        it('should retry only the statuses listed in retryOn', async () => {
            const inner = vi.fn().mockResolvedValue(unavailable());

            const fetchWithRetry = retryFetch(inner as typeof fetch, {
                retries: 2,
                baseDelay: 10,
                retryOn: [502],
            });
            const response = await fetchWithRetry(new Request('https://api.example.com/test'));

            expect(response.status).toBe(503);
            expect(inner).toHaveBeenCalledTimes(1);
        });

        it('should not retry a network error on a non-idempotent method by default', async () => {
            const inner = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

            const fetchWithRetry = retryFetch(inner as typeof fetch, { retries: 2, baseDelay: 10 });

            await expect(
                fetchWithRetry(new Request('https://api.example.com/test', { method: 'POST' }))
            ).rejects.toThrow('fetch failed');
            expect(inner).toHaveBeenCalledTimes(1);
        });

        it('should still retry network errors when retryOn is configured', async () => {
            const inner = vi
                .fn()
                .mockRejectedValueOnce(new TypeError('fetch failed'))
                .mockResolvedValueOnce(new Response('ok', { status: 200 }));

            // retryOn lists statuses; a network error has none, so it must not be vetoed.
            const fetchWithRetry = retryFetch(inner as typeof fetch, {
                retries: 2,
                baseDelay: 10,
                retryOn: [503],
            });
            const response = await fetchWithRetry(new Request('https://api.example.com/test'));

            expect(response.status).toBe(200);
            expect(inner).toHaveBeenCalledTimes(2);
        });

        it('should honour idempotentOnly on the retryOn path', async () => {
            const inner = vi.fn().mockResolvedValue(unavailable());

            const fetchWithRetry = retryFetch(inner as typeof fetch, {
                retries: 2,
                baseDelay: 10,
                retryOn: [503],
            });
            const response = await fetchWithRetry(
                new Request('https://api.example.com/test', { method: 'POST' })
            );

            expect(response.status).toBe(503);
            expect(inner).toHaveBeenCalledTimes(1);
        });

        it('should issue one request when retries is not a usable number', async () => {
            const inner = vi.fn().mockResolvedValue(unavailable());

            const fetchWithRetry = retryFetch(inner as typeof fetch, {
                retries: Number(undefined),
                baseDelay: 10,
            });
            const response = await fetchWithRetry(new Request('https://api.example.com/test'));

            expect(response.status).toBe(503);
            expect(inner).toHaveBeenCalledTimes(1);
        });

        it('should defer to a custom retryCondition', async () => {
            const inner = vi
                .fn()
                .mockResolvedValueOnce(new Response('teapot', { status: 418 }))
                .mockResolvedValueOnce(new Response('ok', { status: 200 }));

            const fetchWithRetry = retryFetch(inner as typeof fetch, {
                retries: 2,
                baseDelay: 10,
                retryCondition: ({ response }) => response?.status === 418,
            });
            const response = await fetchWithRetry(new Request('https://api.example.com/test'));

            expect(response.status).toBe(200);
            expect(inner).toHaveBeenCalledTimes(2);
        });
    });

    describe('retry delay', () => {
        it('should call a custom retryDelay with the attempt number and context', async () => {
            const retryDelay = vi.fn().mockReturnValue(0);
            const inner = vi
                .fn()
                .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
                .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
                .mockResolvedValueOnce(new Response('ok', { status: 200 }));

            const fetchWithRetry = retryFetch(inner as typeof fetch, { retries: 3, retryDelay });
            await fetchWithRetry(new Request('https://api.example.com/test'));

            expect(retryDelay).toHaveBeenCalledTimes(2);
            expect(retryDelay).toHaveBeenNthCalledWith(
                1,
                1,
                expect.objectContaining({ attempt: 1, response: expect.any(Response) })
            );
            expect(retryDelay).toHaveBeenNthCalledWith(
                2,
                2,
                expect.objectContaining({ attempt: 2 })
            );
        });

        it('should cap the delay at maxDelay', async () => {
            const inner = vi
                .fn()
                .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
                .mockResolvedValueOnce(new Response('ok', { status: 200 }));

            // Uncapped, exponential backoff would wait 2000ms before the retry.
            const fetchWithRetry = retryFetch(inner as typeof fetch, {
                retries: 2,
                baseDelay: 2000,
                maxDelay: 20,
            });

            const startedAt = performance.now();
            await fetchWithRetry(new Request('https://api.example.com/test'));
            const elapsed = performance.now() - startedAt;

            expect(elapsed).toBeLessThan(500);
            expect(inner).toHaveBeenCalledTimes(2);
        });

        /**
         * Observes the delay each strategy actually schedules, rather than inferring it
         * from elapsed wall-clock time — `setTimeout` overruns by tens of ms on a loaded
         * CI box, which made the previous timing assertion flaky.
         */
        const scheduledDelays = async (config: Parameters<typeof retryFetch>[1]) => {
            const delays: number[] = [];
            const realSetTimeout = globalThis.setTimeout;
            vi.spyOn(globalThis, 'setTimeout').mockImplementation(((
                callback: () => void,
                ms?: number
            ) => {
                delays.push(ms ?? 0);
                return realSetTimeout(callback, 0);
            }) as typeof setTimeout);

            // A fresh Response per call, as a real fetch returns — a shared instance
            // breaks once a discarded body is released.
            const inner = vi
                .fn()
                .mockImplementation(() =>
                    Promise.resolve(new Response('unavailable', { status: 503 }))
                );

            try {
                await retryFetch(
                    inner as typeof fetch,
                    config
                )(new Request('https://api.example.com/test'));
            } finally {
                // Restored so a second call spies on the real setTimeout rather than
                // wrapping the previous spy, which would leak delays between tests.
                vi.mocked(globalThis.setTimeout).mockRestore();
            }

            return delays;
        };

        it('should grow the delay exponentially by default', async () => {
            expect(await scheduledDelays({ retries: 3, baseDelay: 30 })).toEqual([30, 60, 120]);
        });

        it('should grow the delay linearly when configured', async () => {
            expect(
                await scheduledDelays({ retries: 3, baseDelay: 30, retryDelay: 'linear' })
            ).toEqual([30, 60, 90]);
        });
    });
});
