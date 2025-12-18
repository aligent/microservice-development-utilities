/**
 * Custom error class for HTTP response errors, similar to Axios Error.
 * Provides detailed information about the failed request and response.
 */
export class HttpResponseError extends Error {
    override readonly name = 'HttpResponseError';
    readonly status: number;
    readonly statusText: string;
    readonly response: Response;
    readonly request: Request;
    readonly isHttpResponseError = true;

    constructor(response: Response, request: Request) {
        super(`${response.status}: ${response.statusText}`);
        this.status = response.status;
        this.statusText = response.statusText;
        this.response = response;
        this.request = request;

        // Maintains proper stack trace for where error was thrown (V8 engines)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, HttpResponseError);
        }
    }

    /**
     * Returns a JSON representation of the error for logging/debugging.
     */
    toJson() {
        return {
            name: this.name,
            message: this.message,
            status: this.status,
            statusText: this.statusText,
            method: this.request.method,
            url: this.request.url,
        };
    }
}

/**
 * Type guard to check if an error is an HttpResponseError.
 * Useful for narrowing error types in catch blocks.
 *
 * @param {unknown} error - The error to check.
 * @returns {boolean} True if the error is an HttpResponseError.
 *
 * @example
 * try {
 *     await fetchData();
 * } catch (error) {
 *     if (isHttpResponseError(error)) {
 *         console.log(`Request failed with status ${error.status}`);
 *         console.log(`URL: ${error.request.url}`);
 *     }
 * }
 */
export function isHttpResponseError(error: unknown): error is HttpResponseError {
    return (
        error instanceof HttpResponseError ||
        (typeof error === 'object' &&
            error !== null &&
            'isHttpResponseError' in error &&
            error.isHttpResponseError === true)
    );
}
