import type { Middleware } from 'openapi-fetch';

/**
 * Middleware that applies a timeout to each request using `AbortSignal.timeout`.
 *
 * @param timeoutMs - Maximum time in milliseconds before the request is aborted.
 * @returns A middleware that attaches a timeout signal to the request.
 */
export function requestTimeout(timeoutMs: number): Middleware {
    return {
        async onRequest({ request }) {
            if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
                return request;
            }

            return new Request(request, { signal: AbortSignal.timeout(timeoutMs) });
        },
    };
}
