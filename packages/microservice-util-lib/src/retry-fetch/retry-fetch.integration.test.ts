import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import createClient, { type Middleware } from 'openapi-fetch';
import { throwOnNotOk } from '../openapi-fetch-middlewares/throw-on-not-ok';
import { retryFetch } from './retry-fetch';

/**
 * Exercises retryFetch over real sockets rather than a mocked fetch. The retry loop
 * releases response bodies and clones requests, which only behave meaningfully against
 * a real HTTP stack — a mocked Response has no socket to leak.
 */
interface paths {
    '/xml': {
        get: { responses: { 200: { content: { 'application/json': { parsed: string } } } } };
    };
}

const xmlToJsonMiddleware = (): Middleware => ({
    async onResponse({ response }) {
        const body = await response.text();
        return new Response(JSON.stringify({ parsed: body.replace(/<[^>]+>/g, '') }), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
        });
    },
});

describe('retryFetch over real sockets', () => {
    let server: Server;
    let baseUrl: string;
    let requests: Array<{ method: string; url: string; body: string }>;
    /** Number of leading requests each path should fail before succeeding. */
    let failuresRemaining: number;

    beforeAll(async () => {
        server = createServer((req, res) => {
            const chunks: Buffer[] = [];
            req.on('data', chunk => chunks.push(chunk as Buffer));
            req.on('end', () => {
                requests.push({
                    method: req.method ?? '',
                    url: req.url ?? '',
                    body: Buffer.concat(chunks).toString(),
                });

                if (failuresRemaining > 0) {
                    failuresRemaining--;
                    // A body on the failure response, so discarding it has to release a socket.
                    res.writeHead(503, { 'Content-Type': 'text/plain' });
                    res.end('x'.repeat(4096));
                    return;
                }

                res.writeHead(200, { 'Content-Type': 'application/xml' });
                res.end('<Reference>ref-1641</Reference>');
            });
        });

        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
        const { port } = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${port}`;
    });

    afterAll(async () => {
        await new Promise<void>((resolve, reject) =>
            server.close(err => (err ? reject(err) : resolve()))
        );
    });

    beforeEach(() => {
        requests = [];
        failuresRemaining = 0;
    });

    it('retries a real 503 and returns the eventual success', async () => {
        failuresRemaining = 2;

        const response = await retryFetch(fetch, { retries: 3, baseDelay: 10 })(
            new Request(`${baseUrl}/xml`)
        );

        expect(response.status).toBe(200);
        expect(await response.text()).toBe('<Reference>ref-1641</Reference>');
        expect(requests).toHaveLength(3);
    });

    it('lets a transforming middleware see the retried response', async () => {
        failuresRemaining = 1;

        const client = createClient<paths>({
            baseUrl,
            fetch: retryFetch(fetch, { retries: 2, baseDelay: 10 }),
        });
        client.use(throwOnNotOk(), xmlToJsonMiddleware());

        const { data } = await client.GET('/xml');

        expect(data).toEqual({ parsed: 'ref-1641' });
        expect(requests).toHaveLength(2);
    });

    it('resends the body when retrying a real PUT', async () => {
        failuresRemaining = 1;

        const response = await retryFetch(fetch, { retries: 2, baseDelay: 10 })(
            new Request(`${baseUrl}/xml`, { method: 'PUT', body: JSON.stringify({ id: 1641 }) })
        );

        expect(response.status).toBe(200);
        expect(requests.map(r => r.body)).toEqual([
            JSON.stringify({ id: 1641 }),
            JSON.stringify({ id: 1641 }),
        ]);
    });

    it('releases the body of a superseded response, but not the one it returns', async () => {
        failuresRemaining = 2;
        const served: Response[] = [];
        const observed: typeof fetch = async (input, init) => {
            const response = await fetch(input, init);
            served.push(response);
            return response;
        };

        const returned = await retryFetch(observed, { retries: 3, baseDelay: 10 })(
            new Request(`${baseUrl}/xml`)
        );

        // Cancelling disturbs the stream, so `bodyUsed` distinguishes a released body
        // from one still available to the caller.
        expect(served).toHaveLength(3);
        expect(served[0]?.bodyUsed).toBe(true);
        expect(served[1]?.bodyUsed).toBe(true);
        expect(returned.bodyUsed).toBe(false);
        expect(await returned.text()).toBe('<Reference>ref-1641</Reference>');
    });

    it('sustains many sequential retried requests over real sockets', async () => {
        for (let i = 0; i < 25; i++) {
            failuresRemaining = 1;
            const response = await retryFetch(fetch, { retries: 1, baseDelay: 1 })(
                new Request(`${baseUrl}/xml`)
            );
            expect(response.status).toBe(200);
        }

        expect(requests).toHaveLength(50);
    }, 30000);

    it('abandons the backoff when the caller aborts mid-wait', async () => {
        failuresRemaining = 1;
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 25);

        const startedAt = performance.now();
        await retryFetch(fetch, { retries: 1, baseDelay: 10000 })(
            new Request(`${baseUrl}/xml`, { signal: controller.signal })
        ).catch(() => undefined);

        expect(performance.now() - startedAt).toBeLessThan(2000);
    }, 15000);
});
