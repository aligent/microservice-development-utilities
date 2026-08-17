import type { Middleware } from 'openapi-fetch';

/**
 * Middleware that applies a timeout to each request using `AbortSignal.timeout`.
 *
 * @param timeoutMs - Maximum time in milliseconds before the request is aborted.
 * @returns A middleware that attaches a timeout signal to the request.
 */
export function requestTimeout(timeoutMs: number): Middleware {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new RangeError('requestTimeout requires a positive finite number');
    }

    return {
        async onRequest({ request }) {
            const timeoutSignal = AbortSignal.timeout(timeoutMs);
            const signal = request.signal
                ? AbortSignal.any([request.signal, timeoutSignal])
                : timeoutSignal;

            return new Request(request, { signal });
        },
    };
}
