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
