import createClient from 'openapi-fetch';
import { RetryConfig, retryMiddleware } from './retry';

interface paths {
    '/test': {
        get: { responses: { 200: { content: { 'application/json': { message: string } } } } };
        post: { responses: { 200: { content: { 'application/json': { message: string } } } } };
    };
}

describe('retry middleware', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockFetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('onResponse handling', () => {
        it('should not retry on successful response', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ message: 'success' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware());

            await client.GET('/test');

            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('should retry on 500 error and eventually succeed', async () => {
            mockFetch
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                    })
                )
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                    })
                )
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ message: 'success' }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    })
                );

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware({ retries: 3, baseDelay: 10, fetch: mockFetch }));

            const response = await client.GET('/test');

            // Initial request + 2 retries (third retry succeeds)
            expect(mockFetch).toHaveBeenCalledTimes(3);
            expect(response.response.status).toBe(200);
        });

        it('should respect maximum retry attempts', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                    status: 500,
                    statusText: 'Internal Server Error',
                    headers: { 'Content-Type': 'application/json' },
                })
            );

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware({ retries: 3, baseDelay: 10, fetch: mockFetch }));

            await expect(client.GET('/test')).rejects.toThrow('500: Internal Server Error');

            // Initial request + 3 retries = 4 total calls
            expect(mockFetch).toHaveBeenCalledTimes(4);
        });

        it('should retry on 503 Service Unavailable', async () => {
            mockFetch
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ error: 'Service Unavailable' }), {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' },
                    })
                )
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ message: 'success' }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    })
                );

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware({ retries: 2, baseDelay: 10, fetch: mockFetch }));

            const response = await client.GET('/test');

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(response.response.status).toBe(200);
        });

        it('should retry on 429 Too Many Requests', async () => {
            mockFetch
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ error: 'Too Many Requests' }), {
                        status: 429,
                        headers: { 'Content-Type': 'application/json' },
                    })
                )
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ message: 'success' }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    })
                );

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware({ retries: 2, baseDelay: 10, fetch: mockFetch }));

            const response = await client.GET('/test');

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(response.response.status).toBe(200);
        });

        it('should not retry on 4xx errors (except 408, 429)', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ error: 'Bad Request' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware({ retries: 3, baseDelay: 10 }));

            await client.GET('/test');

            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('should not retry POST requests when idempotentOnly is not false', async () => {
            mockFetch
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                    })
                )
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ message: 'success' }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    })
                );

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(
                retryMiddleware({
                    retries: 2,
                    baseDelay: 10,
                    fetch: mockFetch,
                })
            );

            const response = await client.POST('/test');

            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(response.response.status).toBe(500);
        });

        it('should use custom retry condition', async () => {
            mockFetch
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ error: 'Custom error' }), {
                        status: 418, // I'm a teapot
                        headers: { 'Content-Type': 'application/json' },
                    })
                )
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ message: 'success' }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    })
                );

            const config: RetryConfig = {
                retries: 2,
                baseDelay: 10,
                retryCondition: context => context.response?.status === 418,
                fetch: mockFetch,
            };

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware(config));

            const response = await client.GET('/test');

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(response.response.status).toBe(200);
        });

        it('should use exponential backoff by default', async () => {
            const delays: number[] = [];
            const startTimes: number[] = [];

            mockFetch.mockImplementation(async () => {
                startTimes.push(Date.now());
                return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            });

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware({ retries: 3, baseDelay: 100, fetch: mockFetch }));

            try {
                await client.GET('/test');
            } catch {
                // Expected to throw after exhausting retries
            }

            // Calculate delays between requests
            for (let i = 1; i < startTimes.length; i++) {
                delays.push(startTimes[i]! - startTimes[i - 1]!);
            }

            // Exponential backoff: 100ms, 200ms, 400ms
            // Allow some tolerance for timing
            expect(delays[0]).toBeGreaterThanOrEqual(80); // ~100ms
            expect(delays[0]).toBeLessThan(150);
            expect(delays[1]).toBeGreaterThanOrEqual(180); // ~200ms
            expect(delays[1]).toBeLessThan(250);
            expect(delays[2]).toBeGreaterThanOrEqual(380); // ~400ms
            expect(delays[2]).toBeLessThan(450);
        });

        it('should use linear backoff when specified', async () => {
            const delays: number[] = [];
            const startTimes: number[] = [];

            mockFetch.mockImplementation(async () => {
                startTimes.push(Date.now());
                return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            });

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(
                retryMiddleware({
                    retries: 3,
                    baseDelay: 100,
                    retryDelay: 'linear',
                    fetch: mockFetch,
                })
            );

            try {
                await client.GET('/test');
            } catch {
                // Expected to throw after exhausting retries
            }

            // Calculate delays between requests
            for (let i = 1; i < startTimes.length; i++) {
                delays.push(startTimes[i]! - startTimes[i - 1]!);
            }

            // Linear backoff: 100ms, 200ms, 300ms
            // Allow some tolerance for timing
            expect(delays[0]).toBeGreaterThanOrEqual(80); // ~100ms
            expect(delays[0]).toBeLessThan(150);
            expect(delays[1]).toBeGreaterThanOrEqual(180); // ~200ms
            expect(delays[1]).toBeLessThan(250);
            expect(delays[2]).toBeGreaterThanOrEqual(280); // ~300ms
            expect(delays[2]).toBeLessThan(350);
        });

        it('should use custom retry delay function', async () => {
            const customDelayFn = vi.fn().mockReturnValue(50);

            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

            const config: RetryConfig = {
                retries: 2,
                retryDelay: customDelayFn,
                fetch: mockFetch,
            };

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware(config));

            try {
                await client.GET('/test');
            } catch {
                // Expected to throw after exhausting retries
            }

            expect(customDelayFn).toHaveBeenCalledTimes(2);
            expect(customDelayFn).toHaveBeenCalledWith(1, expect.objectContaining({ attempt: 1 }));
            expect(customDelayFn).toHaveBeenCalledWith(2, expect.objectContaining({ attempt: 2 }));
        });

        it('should call onRetry callback', async () => {
            const onRetryCallback = vi.fn();

            mockFetch
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                    })
                )
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ message: 'success' }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    })
                );

            const config: RetryConfig = {
                retries: 2,
                baseDelay: 10,
                onRetry: onRetryCallback,
                fetch: mockFetch,
            };

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware(config));

            await client.GET('/test');

            expect(onRetryCallback).toHaveBeenCalledTimes(1);
            expect(onRetryCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    attempt: 1,
                    response: expect.any(Response),
                    request: expect.any(Request),
                })
            );
        });

        it('should retry on specific status codes when retryOn is specified', async () => {
            mockFetch
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ error: 'Bad Gateway' }), {
                        status: 502,
                        headers: { 'Content-Type': 'application/json' },
                    })
                )
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ message: 'success' }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    })
                );

            const config: RetryConfig = {
                retries: 2,
                baseDelay: 10,
                retryOn: [502, 503],
                fetch: mockFetch,
            };

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware(config));

            const response = await client.GET('/test');

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(response.response.status).toBe(200);
        });

        it('should not retry on status codes not in retryOn list', async () => {
            mockFetch.mockResolvedValue(
                new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

            const config: RetryConfig = {
                retries: 2,
                baseDelay: 10,
                retryOn: [502, 503], // 500 not included
                fetch: mockFetch,
            };

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware(config));

            await client.GET('/test');

            // Should not retry because 500 is not in retryOn list
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('should respect maxRetryDelay', async () => {
            const delays: number[] = [];
            const startTimes: number[] = [];

            mockFetch.mockImplementation(async () => {
                startTimes.push(Date.now());
                return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            });

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            // Exponential backoff would be: 1000ms, 2000ms, 4000ms
            // But maxRetryDelay is 1500ms, so all should be capped
            client.use(
                retryMiddleware({
                    retries: 3,
                    baseDelay: 1000,
                    maxDelay: 1500,
                    fetch: mockFetch,
                })
            );

            try {
                await client.GET('/test');
            } catch {
                // Expected to throw after exhausting retries
            }

            // Calculate delays between requests
            for (let i = 1; i < startTimes.length; i++) {
                delays.push(startTimes[i]! - startTimes[i - 1]!);
            }

            // All delays should be <= maxRetryDelay
            delays.forEach(delay => {
                expect(delay).toBeLessThan(1600); // Allow some tolerance
            });
        });
    });

    describe('onError handling', () => {
        it('should retry on network errors', async () => {
            mockFetch
                .mockRejectedValueOnce(new TypeError('fetch failed'))
                .mockRejectedValueOnce(new TypeError('fetch failed'))
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ message: 'success' }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    })
                );

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware({ retries: 3, baseDelay: 10, fetch: mockFetch }));

            const response = await client.GET('/test');

            // Initial request + 2 retries (third attempt succeeds)
            expect(mockFetch).toHaveBeenCalledTimes(3);
            expect(response.response.status).toBe(200);
        });

        it('should throw error after exhausting retries on network errors', async () => {
            const networkError = new TypeError('fetch failed');
            mockFetch.mockRejectedValue(networkError);

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware({ retries: 3, baseDelay: 10, fetch: mockFetch }));

            await expect(client.GET('/test')).rejects.toThrow('fetch failed');

            // Initial request + 3 retries = 4 total calls
            expect(mockFetch).toHaveBeenCalledTimes(4);
        });

        it('should handle TypeError for network errors', async () => {
            mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(
                new Response(JSON.stringify({ message: 'success' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware({ retries: 2, baseDelay: 10, fetch: mockFetch }));

            const response = await client.GET('/test');

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(response.response.status).toBe(200);
        });

        it('should call onRetry callback for network errors', async () => {
            const onRetryCallback = vi.fn();

            mockFetch.mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(
                new Response(JSON.stringify({ message: 'success' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

            const config: RetryConfig = {
                retries: 2,
                baseDelay: 10,
                onRetry: onRetryCallback,
                fetch: mockFetch,
            };

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware(config));

            await client.GET('/test');

            expect(onRetryCallback).toHaveBeenCalledTimes(1);
            expect(onRetryCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    attempt: 1,
                    error: expect.any(Error),
                    request: expect.any(Request),
                    response: null,
                })
            );
        });

        it('should use custom retry condition with network errors', async () => {
            const customRetryCondition = vi.fn().mockReturnValue(false);

            mockFetch.mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(
                new Response(JSON.stringify({ message: 'success' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                })
            );

            const config: RetryConfig = {
                retries: 2,
                baseDelay: 10,
                retryCondition: customRetryCondition,
                fetch: mockFetch,
            };

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware(config));

            await client.GET('/test');

            expect(mockFetch).toHaveBeenCalledTimes(2);
            // After retry succeeds, retry condition is called with successful response context
            expect(customRetryCondition).toHaveBeenCalledWith(
                expect.objectContaining({
                    attempt: 2,
                    response: expect.any(Response),
                    error: null,
                }),
                true
            );
        });

        it('should handle mixed network errors and HTTP errors', async () => {
            mockFetch
                .mockRejectedValueOnce(new TypeError('fetch failed'))
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' },
                    })
                )
                .mockResolvedValueOnce(
                    new Response(JSON.stringify({ message: 'success' }), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    })
                );

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware({ retries: 3, baseDelay: 10, fetch: mockFetch }));

            const response = await client.GET('/test');

            // Initial request (network error) + 2 retries (500 error, then success)
            expect(mockFetch).toHaveBeenCalledTimes(3);
            expect(response.response.status).toBe(200);
        });

        it('should not retry and throw error on non-network errors', async () => {
            mockFetch.mockRejectedValue(new Error('not a fetch error'));

            const client = createClient<paths>({
                baseUrl: 'https://api.example.com',
                fetch: mockFetch,
            });
            client.use(retryMiddleware({ retries: 3, baseDelay: 10, fetch: mockFetch }));

            await expect(client.GET('/test')).rejects.toThrow('not a fetch error');

            // Initial request only
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    it('should throw error when final response is not ok after exhausting retries', async () => {
        mockFetch.mockResolvedValue(
            new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                status: 500,
                statusText: 'Internal Server Error',
                headers: { 'Content-Type': 'application/json' },
            })
        );

        const client = createClient<paths>({
            baseUrl: 'https://api.example.com',
            fetch: mockFetch,
        });
        client.use(retryMiddleware({ retries: 2, baseDelay: 10, fetch: mockFetch }));

        await expect(client.GET('/test')).rejects.toThrow('500: Internal Server Error');

        // Initial request + 2 retries = 3 total calls
        expect(mockFetch).toHaveBeenCalledTimes(3);
    });
});
