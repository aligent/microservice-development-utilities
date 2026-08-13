import type {
    OnRetryFn,
    RetryConditionFn,
    RetryContext,
    RetryDelayFn,
} from '../openapi-fetch-middlewares/types/retry';
import { isNetworkError } from '../openapi-fetch-middlewares/utils/is-network-error';

const IDEMPOTENT_HTTP_METHODS: readonly string[] = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'];

/**
 * Configuration for {@link retryFetch}.
 *
 * @interface RetryFetchConfig
 * @property {number} [retries=3] - The maximum number of retry attempts after the first.
 * @property {RetryDelayFn | 'exponential' | 'linear'} [retryDelay='exponential']
 * - Strategy for calculating the delay between retries.
 *      - 'exponential': `baseDelay * 2^(attempt - 1)`
 *      - 'linear': `baseDelay * attempt`
 *      - Custom function: receives the attempt number and the {@link RetryContext}.
 * @property {number} [baseDelay=100] - Base delay in milliseconds for the built-in strategies.
 * @property {number} [maxDelay=30000] - Upper bound in milliseconds for the built-in strategies.
 * @property {OnRetryFn} [onRetry]
 * - Called before each retry, never before the first attempt.
 * - Receives a clone of the request, so reading the body to re-sign it is safe.
 * - Returning a `Request` replaces the one used for the retry; returning `void` keeps it.
 * @property {number[]} [retryOn]
 * - Allow-list of HTTP status codes that trigger a retry, replacing the default status check.
 * - Applies to *statuses only*: network errors still retry via `retryCondition`, and
 *   `idempotentOnly` still applies.
 * @property {RetryConditionFn} [retryCondition]
 * - Decides whether to retry. Defaults to 5xx, 429, 408 and network errors.
 * - Ignored for responses whose status is checked against `retryOn`, when that is supplied.
 * @property {boolean} [idempotentOnly=true]
 * - Retry only GET, HEAD, OPTIONS, PUT and DELETE.
 * - Set `false` to retry POST and PATCH, accepting the risk of a duplicated write when the
 *   server processed a request whose response was lost.
 *
 * Note there is no `throwOnNotOk`: `retryFetch` returns non-OK responses as-is. Register the
 * `throwOnNotOk()` middleware when the caller should receive an `HttpResponseError` instead.
 */
export interface RetryFetchConfig {
    retries?: number;
    baseDelay?: number;
    maxDelay?: number;
    retryDelay?: RetryDelayFn | 'exponential' | 'linear';
    onRetry?: OnRetryFn;
    retryOn?: number[];
    retryCondition?: RetryConditionFn;
    idempotentOnly?: boolean;
}

function getRetryDelayFn(config?: RetryFetchConfig): RetryDelayFn {
    const baseDelay = config?.baseDelay ?? 100;
    const maxDelay = config?.maxDelay ?? 30000;
    const retryDelay = config?.retryDelay;

    if (typeof retryDelay === 'function') {
        return retryDelay;
    }

    if (retryDelay === 'linear') {
        return (attempt: number) => Math.min(baseDelay * attempt, maxDelay);
    }

    return (attempt: number) => Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
}

function defaultRetryCondition(context: RetryContext, idempotentOnly: boolean): boolean {
    const { request, response, error } = context;

    if (idempotentOnly && !IDEMPOTENT_HTTP_METHODS.includes(request.method)) {
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
 * Waits, but gives up early if the caller aborts — otherwise an aborted request
 * still sleeps out the full backoff (up to `maxDelay`) before failing.
 */
function wait(ms: number, signal?: AbortSignal | null): Promise<void> {
    if (ms <= 0 || signal?.aborted) {
        return Promise.resolve();
    }

    return new Promise(resolve => {
        const finish = () => {
            clearTimeout(timer);
            signal?.removeEventListener('abort', finish);
            resolve();
        };

        const timer = setTimeout(finish, ms);
        signal?.addEventListener('abort', finish, { once: true });
    });
}

type FetchInput = Parameters<typeof fetch>[0];

function toRequest(input: FetchInput, init?: RequestInit): Request {
    return input instanceof Request ? input : new Request(input, init);
}

/**
 * Wraps a fetch implementation with retry behaviour.
 *
 * Retries happen beneath any openapi-fetch middleware chain, so every attempt's
 * response flows through the full chain rather than only the first.
 *
 * Omit the fetch implementation to use the global fetch. It is resolved on each
 * attempt rather than captured here, so a fetch replaced later (a test double, or
 * runtime instrumentation) still applies.
 *
 * @param {RetryFetchConfig} [config={}] - The retry configuration.
 * @returns {typeof fetch} A fetch function that retries according to the configuration.
 *
 * @example
 * // Global fetch, default retry behaviour
 * const client = createClient<paths>({ baseUrl, fetch: retryFetch() });
 *
 * @example
 * // Global fetch, custom configuration
 * const client = createClient<paths>({ baseUrl, fetch: retryFetch({ retries: 5 }) });
 *
 * @example
 * // A specific transport, such as the one the client was configured with
 * const client = createClient<paths>({ baseUrl, fetch: retryFetch(myFetch, { retries: 5 }) });
 */
export function retryFetch(config?: RetryFetchConfig): typeof fetch;
/**
 * Accepts `undefined` so an optional transport can be passed straight through,
 * such as `retryFetch(options.fetch)` where `ClientOptions.fetch` may be unset.
 *
 * @param {typeof fetch} [fetchImpl] - The fetch implementation to wrap.
 * @param {RetryFetchConfig} [config={}] - The retry configuration.
 * @returns {typeof fetch} A fetch function that retries according to the configuration.
 */
export function retryFetch(
    fetchImpl: typeof fetch | undefined,
    config?: RetryFetchConfig
): typeof fetch;
export function retryFetch(
    fetchImplOrConfig?: typeof fetch | RetryFetchConfig,
    maybeConfig?: RetryFetchConfig
): typeof fetch {
    const explicitFetch = typeof fetchImplOrConfig === 'function' ? fetchImplOrConfig : undefined;
    const config = typeof fetchImplOrConfig === 'function' ? maybeConfig : fetchImplOrConfig;

    // Resolved per attempt rather than defaulted here: capturing globalThis.fetch at
    // construction silently bypasses a fetch patched afterwards.
    const fetchImpl: typeof fetch = (input, init) =>
        explicitFetch ? explicitFetch(input, init) : globalThis.fetch(input, init);

    // Guards against `Number(process.env.RETRIES)` style config: a NaN or negative
    // count would skip the loop entirely and reject with undefined rather than
    // issuing a single request.
    const configuredRetries = config?.retries ?? 3;
    const retries = Number.isFinite(configuredRetries) ? Math.max(0, configuredRetries) : 0;
    const retryDelay = getRetryDelayFn(config);
    const onRetry = config?.onRetry;
    const retryOn = config?.retryOn;
    const retryCondition = config?.retryCondition ?? defaultRetryCondition;
    const idempotentOnly = config?.idempotentOnly ?? true;

    const isIdempotent = (request: Request): boolean =>
        !idempotentOnly || IDEMPOTENT_HTTP_METHODS.includes(request.method);

    const shouldRetry = async (context: RetryContext): Promise<boolean> => {
        // retryOn is an allow-list of *statuses*. A network error has no status to
        // match, so it falls through to the condition rather than being vetoed —
        // otherwise configuring retryOn would silently disable connection retries.
        if (retryOn && retryOn.length > 0 && context.response) {
            return retryOn.includes(context.response.status) && isIdempotent(context.request);
        }

        return await retryCondition(context, idempotentOnly);
    };

    return async (input, init) => {
        let current = input;
        let response: Response | undefined;
        let error: Error | undefined;

        for (let attempt = 0; attempt <= retries; attempt++) {
            if (attempt > 0) {
                const request = toRequest(current, init);
                const context: RetryContext = {
                    attempt,
                    // A clone, so a callback that reads the body to re-sign it (HMAC over
                    // body, for example) does not consume the request we are about to send.
                    request: request.clone(),
                    response: response ?? null,
                    error: error ?? null,
                };

                await wait(await retryDelay(attempt, context), request.signal);

                if (onRetry) {
                    const replacement = await onRetry(context);

                    if (replacement instanceof Request) {
                        current = replacement;
                    }
                }

                // The superseded response is now discarded. Releasing it returns the
                // socket to the pool — under undici an unread body holds its connection
                // until GC, which exhausts the pool against a flapping upstream. Done
                // after onRetry so a callback can still inspect that response.
                void response?.body?.cancel().catch(() => undefined);
            }

            try {
                // Cloned per attempt so a body-bearing request can be sent more than
                // once — a Request's body stream is consumed by the first fetch.
                response = await fetchImpl(
                    current instanceof Request ? current.clone() : current,
                    init
                );
                error = undefined;

                const retryable = await shouldRetry({
                    attempt: attempt + 1,
                    request: toRequest(current, init),
                    response,
                    error: null,
                });

                if (!retryable) {
                    return response;
                }
            } catch (err) {
                // A non-network error is not worth another attempt, and masking it
                // behind the retry loop would hide the real failure from the caller.
                if (!isNetworkError(err)) {
                    throw err;
                }

                response = undefined;
                error = err;

                const retryable = await shouldRetry({
                    attempt: attempt + 1,
                    request: toRequest(current, init),
                    response: null,
                    error: err,
                });

                if (!retryable) {
                    throw err;
                }
            }
        }

        if (response) {
            return response;
        }

        throw error;
    };
}
