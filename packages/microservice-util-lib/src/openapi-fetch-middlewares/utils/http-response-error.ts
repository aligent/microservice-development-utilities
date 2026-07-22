import { parseBody } from './body-parser';

/**
 * Serializable snapshot of an HTTP request.
 * Captures all meaningful data at creation time so it can be
 * logged, serialized, or inspected without stream-consumption issues.
 */
export interface HttpRequestData {
    readonly method: string;
    readonly url: string;
    readonly params: Record<string, string>;
    readonly headers: Record<string, string>;
    readonly body: unknown;
}

/**
 * Serializable snapshot of an HTTP response.
 * Captures all meaningful data at creation time so it can be
 * logged, serialized, or inspected without stream-consumption issues.
 */
export interface HttpResponseData<TBody = unknown> {
    readonly status: number;
    readonly statusText: string;
    readonly headers: Record<string, string>;
    readonly body: TBody;
}

/**
 * Custom error class for HTTP response errors, similar to Axios Error.
 * Provides detailed information about the failed request and response.
 *
 * Stores pre-read, serializable snapshots of the request and response
 * rather than raw Request/Response objects, ensuring bodies are always
 * available for logging and debugging.
 */
export class HttpResponseError<TBody = unknown> extends Error {
    override readonly name = 'HttpResponseError';
    readonly status: number;
    readonly statusText: string;
    readonly response: HttpResponseData<TBody>;
    readonly request: HttpRequestData;
    readonly isHttpResponseError = true;

    private constructor(request: HttpRequestData, response: HttpResponseData<TBody>) {
        super(`${response.status}: ${response.statusText}`);
        this.status = response.status;
        this.statusText = response.statusText;
        this.request = request;
        this.response = response;

        // Maintains proper stack trace for where error was thrown (V8 engines)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, HttpResponseError);
        }
    }

    /**
     * Creates an HttpResponseError with pre-read request and response bodies.
     * Bodies are read eagerly so they are available for logging/serialization.
     */
    static async create<TBody = unknown>(
        response: Response,
        request: Request
    ): Promise<HttpResponseError<TBody>> {
        const url = new URL(request.url);

        // If request.bodyUsed is true then it can't be cloned and will throw a type error
        const requestBody = request.bodyUsed
            ? null
            : await parseBody(request.clone(), request.headers.get('content-type'));
        const responseBody = response.bodyUsed
            ? null
            : await parseBody(response.clone(), response.headers.get('content-type'));

        const requestData: HttpRequestData = {
            method: request.method,
            url: request.url,
            params: Object.fromEntries(url.searchParams.entries()),
            headers: Object.fromEntries(request.headers.entries()),
            body: requestBody,
        };

        const responseData: HttpResponseData<TBody> = {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: responseBody as TBody,
        };

        return new HttpResponseError<TBody>(requestData, responseData);
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
            request: this.request,
            response: this.response,
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
export function isHttpResponseError<TBody = unknown>(
    error: unknown
): error is HttpResponseError<TBody> {
    return (
        error instanceof HttpResponseError ||
        (typeof error === 'object' &&
            error !== null &&
            'isHttpResponseError' in error &&
            error.isHttpResponseError === true)
    );
}
