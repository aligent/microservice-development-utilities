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
 * @param {boolean} idempotentOnly - Whether to retry only when the HTTP method is an idempotent methods.
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
 * @param {RetryContext} context - The retry context containing attempt information.
 * @returns {void | Promise<void>}
 */
export type OnRetryFn = (context: RetryContext) => void | Promise<void>;

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
 * @property {number} [retryDelayBase=100] - Base delay in milliseconds for built-in delay strategies.
 * @property {number} [maxRetryDelay=30000] - Maximum delay in milliseconds between retry attempts.
 * @property {boolean} [shouldResetTimeout=false] - Whether to reset the timeout between retries.
 * @property {OnRetryFn} [onRetry] - Callback function executed before each retry attempt.
 * @property {number[]} [retryOn]
 * - Array of HTTP status codes that should trigger a retry.
 * - If not specified, defaults to 5xx, 429 and 408 errors.
 * @property {boolean} [idempotentOnly]
 * - Whether to retry only when the HTTP method is an idempotent methods.
 * - If not specified, defaults to true and retry only on GET, HEAD, OPTIONS, PUT or DELETE method.
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
    fetch?: typeof fetch;
}

export type NormalisedConfig = Omit<
    RetryConfig,
    'retries' | 'retryCondition' | 'retryDelay' | 'idempotentOnly' | 'fetch'
> & {
    retries: number;
    retryCondition: RetryConditionFn;
    retryDelay: RetryDelayFn;
    idempotentOnly: boolean;
    fetch: typeof fetch;
};
