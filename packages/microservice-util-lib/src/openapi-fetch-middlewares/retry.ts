import type { Middleware } from 'openapi-fetch';
import type { NormalisedConfig, RetryConfig, RetryContext, RetryDelayFn } from './types/retry';
import { HttpResponseError, isHttpResponseError } from './utils/http-response-error';
import { isNetworkError } from './utils/is-network-error';

const IDEMPOTENT_HTTP_METHODS: string[] = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'] as const;

/**
 * Default retry condition function.
 * Retries on:
 * - Network errors
 * - 5xx server errors
 * - 429 Too Many Requests
 * - 408 Request Timeout
 * - Idempotent methods only
 *
 * @param {RetryContext} context - The retry context.
 * @param {boolean} idempotentOnly - Whether to retry only when the HTTP method is an idempotent methods.
 * @returns {boolean} Whether the request should be retried.
 */
function defaultRetryCondition(context: RetryContext, idempotentOnly: boolean): boolean {
    const { request, response, error } = context;

    if (!IDEMPOTENT_HTTP_METHODS.includes(request.method) && idempotentOnly) {
        return false;
    }

    if (isNetworkError(error)) {
        return true;
    }

    if (response) {
        return response.status >= 500 || response.status === 429 || response.status === 408;
    }

    return false;
}

/**
 * Calculates delay for exponential backoff strategy.
 *
 * @param {number} attempt - The current attempt number (1-indexed).
 * @param {number} baseDelay - Base delay in milliseconds.
 * @param {number} maxDelay - Maximum delay in milliseconds.
 * @returns {number} The delay in milliseconds.
 */
function exponentialDelay(attempt: number, baseDelay: number, maxDelay: number): number {
    const delay = baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, maxDelay);
}

/**
 * Calculates delay for linear backoff strategy.
 *
 * @param {number} attempt - The current attempt number (1-indexed).
 * @param {number} baseDelay - Base delay in milliseconds.
 * @param {number} maxDelay - Maximum delay in milliseconds.
 * @returns {number} The delay in milliseconds.
 */
function linearDelay(attempt: number, baseDelay: number, maxDelay: number): number {
    const delay = baseDelay * attempt;
    return Math.min(delay, maxDelay);
}

/**
 * Gets the retry delay function based on the configuration.
 *
 * @param {RetryConfig} config - The retry configuration.
 * @returns {RetryDelayFn} The retry delay function.
 */
function getRetryDelayFn(config?: RetryConfig): RetryDelayFn {
    const baseDelay = config?.baseDelay ?? 100;
    const maxDelay = config?.maxDelay ?? 30000;
    const retryDelay = config?.retryDelay;

    if (typeof retryDelay === 'function') {
        return retryDelay;
    }

    switch (retryDelay) {
        case 'linear':
            return (attempt: number) => linearDelay(attempt, baseDelay, maxDelay);
        case 'exponential':
        default:
            return (attempt: number) => exponentialDelay(attempt, baseDelay, maxDelay);
    }
}

/**
 * Checks if the response status should trigger a retry based on the retryOn configuration.
 *
 * @param {number} status - The HTTP status code.
 * @param {number[]} retryOn - Array of status codes to retry on.
 * @returns {boolean} Whether the status should trigger a retry.
 */
function shouldRetryOnStatus(status: number, retryOn: number[]): boolean {
    return retryOn.includes(status);
}

/**
 * Checks the response status and throws HttpResponseError if it's not "ok".
 *
 * @param {Response} response - The HTTP response object.
 * @param {Request} request - The HTTP request object.
 * @throws {HttpResponseError} When the response is not an "ok" response.
 */
function throwErrorIfNotOkResponse(response: Response, request: Request) {
    if (!response.ok) {
        throw new HttpResponseError(response, request);
    }
}

/**
 * This middleware implements retry logic with support for:
 * - Configurable number of retry attempts
 * - Exponential backoff, linear backoff, or custom delay strategies
 * - Custom retry conditions
 * - Callbacks for retry events
 * - Filtering by status codes
 *
 * @param {RetryConfig} [config={}] - The retry configuration.
 * @returns {Middleware} The middleware for retry functionality.
 *
 * @example
 * // Basic usage with defaults (3 retries, exponential backoff)
 * const middleware = retryMiddleware();
 *
 * @example
 * // Custom configuration
 * const middleware = retryMiddleware({
 *     retries: 5,
 *     retryDelay: 'linear',
 *     retryDelayBase: 200,
 *     retryOn: [500, 502, 503, 504],
 *     onRetry: (context) => {
 *         console.log(`Retrying request (attempt ${context.attemptNumber})`);
 *     },
 * });
 *
 * @example
 * // Custom retry condition
 * const middleware = retryMiddleware({
 *     retries: 3,
 *     retryCondition: async (context) => {
 *         // Only retry on 503 Service Unavailable
 *         return context.response.status === 503;
 *     },
 * });
 *
 * @example
 * // Custom delay function
 * const middleware = retryMiddleware({
 *     retries: 3,
 *     retryDelay: (attemptNumber) => {
 *         // Custom delay with jitter
 *         const baseDelay = 100 * Math.pow(2, attemptNumber);
 *         const jitter = Math.random() * 100;
 *         return baseDelay + jitter;
 *     },
 * });
 */
function retryMiddleware(config?: RetryConfig): Middleware {
    const normalisedConfig: NormalisedConfig = {
        ...config,
        retries: config?.retries ?? 3,
        retryCondition: config?.retryCondition ?? defaultRetryCondition,
        retryDelay: getRetryDelayFn(config),
        idempotentOnly: config?.idempotentOnly ?? true,
        fetch: config?.fetch ?? fetch,
    };

    return {
        async onResponse({ request, response }) {
            const context = { attempt: 1, request, response, error: null };

            // If retryOn is specified, only use that list
            if (config?.retryOn && config.retryOn.length > 0) {
                if (!shouldRetryOnStatus(response.status, config.retryOn)) {
                    throwErrorIfNotOkResponse(response, request);
                    return response;
                }

                return await performRetries(normalisedConfig, context);
            }

            // Otherwise, check if we should retry based on retry condition
            const shouldRetry = await normalisedConfig.retryCondition(
                context,
                normalisedConfig.idempotentOnly
            );
            if (!shouldRetry) {
                throwErrorIfNotOkResponse(response, request);
                return response;
            }

            return await performRetries(normalisedConfig, context);
        },
        async onError({ request, error }) {
            if (!isNetworkError(error)) {
                throw error;
            }

            return await performRetries(normalisedConfig, {
                attempt: 1,
                request,
                response: null,
                error,
            });
        },
    };
}

/**
 * Performs the retry attempts.
 */
async function performRetries(config: NormalisedConfig, context: RetryContext): Promise<Response> {
    const maxRetries = config.retries;
    let response = context.response;
    let attempt = 1;

    do {
        const delay = await config.retryDelay(attempt, { ...context, attempt, response });
        await new Promise(resolve => setTimeout(resolve, delay));

        if (config.onRetry) {
            await config.onRetry({ ...context, attempt, response });
        }

        try {
            const signal = config.shouldResetTimeout ? undefined : context.request.signal;
            response = await config.fetch(new Request(context.request, { signal }));

            context = { ...context, attempt: attempt + 1, response, error: null };

            attempt++;
        } catch (err) {
            // Network error occurred during retry
            const error = err instanceof Error ? err : new Error(String(err));
            context = { ...context, attempt: attempt + 1, response, error };

            attempt++;
        }

        if (!response) {
            continue;
        }

        if (config.retryOn && !shouldRetryOnStatus(response?.status, config.retryOn)) {
            throwErrorIfNotOkResponse(response, context.request);
            return response;
        }

        const shouldRetry = await config.retryCondition(context, config.idempotentOnly);
        if (!shouldRetry) {
            throwErrorIfNotOkResponse(response, context.request);
            return response;
        }
    } while (attempt <= maxRetries);

    if (!response) {
        throw context.error;
    }

    throwErrorIfNotOkResponse(response, context.request);
    return response;
}

export { HttpResponseError, isHttpResponseError, retryMiddleware };
export type { RetryConfig, RetryContext, RetryDelayFn };
