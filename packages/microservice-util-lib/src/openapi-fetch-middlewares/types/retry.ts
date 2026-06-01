/**
 * Represents the context for a retry attempt.
 *
 * @interface RetryContext
 * @property {number} attempt - The current attempt number (1-indexed).
 * @property {Request} request - The original request being retried.
 * @property {Response | null} response - The response that triggered the retry.
 * @property {Error | null} error - The error that triggered the retry, if any.
 */
export interface RetryContext {
    attempt: number;
    request: Request;
    response: Response | null;
    error: Error | null;
}

/**
 * Function type for custom retry condition.
 * Returns true if the request should be retried.
 *
 * @param {RetryContext} context - The retry context containing attempt information.
 * @param {boolean} idempotentOnly - Whether to retry only when the HTTP method is idempotent.
 * @returns {boolean | Promise<boolean>} Whether to retry the request.
 */
export type RetryConditionFn = (
    context: RetryContext,
    idempotentOnly: boolean
) => boolean | Promise<boolean>;

/**
 * Function type for custom retry delay calculation.
 * Returns the delay in milliseconds before the next retry attempt.
 *
 * @param {number} attempt - The current attempt number (1-indexed).
 * @param {RetryContext} context - The retry context containing attempt information.
 * @returns {number | Promise<number>} The delay in milliseconds.
 */
export type RetryDelayFn = (attempt: number, context: RetryContext) => number | Promise<number>;

/**
 * Function type for the onRetry callback.
 * Called before each retry attempt.
 *
 * - If the function returns a `Request` (or `Promise<Request>`), that request replaces
 *   the current one for the retry attempt. This is useful for regenerating authentication
 *   headers (e.g., OAuth 1.0a re-signing).
 * - If the function returns `void`, the original request is used as-is.
 *
 * @param {RetryContext} context - The retry context containing attempt information.
 * @returns {Request | void | Promise<Request | void>}
 */
export type OnRetryFn = (context: RetryContext) => Request | void | Promise<Request | void>;

/**
 * Configuration for the retry middleware.
 *
 * This interface provides options to configure retry behavior, including:
 * - Number of retry attempts
 * - Custom retry conditions
 * - Retry delay strategies (exponential backoff, linear, custom)
 * - Callbacks for retry events
 *
 * @interface RetryConfig
 * @property {number} [retries=3] - The maximum number of retry attempts.
 * @property {RetryConditionFn} [retryCondition]
 * - Custom function to determine if a request should be retried.
 * - Defaults to retrying on 5xx, 429, 408 errors and network errors.
 * @property {RetryDelayFn | 'exponential' | 'linear'} [retryDelay='exponential']
 * - Strategy for calculating delay between retries.
 *      - 'exponential': Exponential backoff (100ms * 2^attemptNumber)
 *      - 'linear': Linear backoff (100ms * attemptNumber)
 *      - Custom function: Allows custom delay calculation
 * @property {number} [baseDelay=100] - Base delay in milliseconds for built-in delay strategies.
 * @property {number} [maxDelay=30000] - Maximum delay in milliseconds between retry attempts.
 * @property {boolean} [shouldResetTimeout=false] - Whether to reset the timeout between retries.
 * @property {OnRetryFn} [onRetry]
 * - Callback executed before each retry attempt (not the initial request).
 * - If it returns a `Request`, that request replaces the current one for the retry.
 *   Useful for regenerating authentication headers (e.g., OAuth 1.0a re-signing).
 * - If it returns `void`, the original request is used as-is.
 * @property {number[]} [retryOn]
 * - Array of HTTP status codes that should trigger a retry.
 * - Defaults to 5xx, 429, and 408 errors.
 * @property {boolean} [idempotentOnly=true]
 * - Whether to retry only when the HTTP method is idempotent.
 * - Defaults to `true`, retrying only on GET, HEAD, OPTIONS, PUT, or DELETE methods.
 * @property {boolean} [throwOnNotOk=true]
 * - Whether to throw an `HttpResponseError` when the final response has a non-OK status (i.e. not 2xx).
 * - Defaults to `true` for backward compatibility.
 * - Set to `false` to return the response as-is, which allows downstream middlewares
 *   (e.g. logging middleware) to inspect the response before the caller handles the error.
 * @property {typeof fetch} [fetch]
 * - Custom fetch function to use for retries. Defaults to the global fetch function.
 * - Useful for testing or using a custom fetch implementation.
 */
export interface RetryConfig {
    retries?: number;
    retryCondition?: RetryConditionFn;
    retryDelay?: RetryDelayFn | 'exponential' | 'linear';
    baseDelay?: number;
    maxDelay?: number;
    shouldResetTimeout?: boolean;
    onRetry?: OnRetryFn;
    retryOn?: number[];
    idempotentOnly?: boolean;
    throwOnNotOk?: boolean;
    fetch?: typeof fetch;
}

export type NormalisedConfig = Omit<
    RetryConfig,
    'retries' | 'retryCondition' | 'retryDelay' | 'idempotentOnly' | 'throwOnNotOk' | 'fetch'
> & {
    retries: number;
    retryCondition: RetryConditionFn;
    retryDelay: RetryDelayFn;
    idempotentOnly: boolean;
    throwOnNotOk: boolean;
    fetch: typeof fetch;
};
