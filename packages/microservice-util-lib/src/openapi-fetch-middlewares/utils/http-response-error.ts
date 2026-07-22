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
 *
 * @typeParam TBody - The expected shape of the parsed response body.
 *   Defaults to `unknown`; no runtime validation is performed.
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
 *
 * @typeParam TBody - The expected shape of the parsed response body.
 *   Defaults to `unknown`. The body is cast to this type at creation
 *   time — no runtime validation is performed, so callers should only
 *   supply a type parameter when they are confident of the response shape.
 *
 * @example
 * ```ts
 * interface ApiError { code: string; message: string }
 *
 * try {
 *     await client.GET('/resource');
 * } catch (err) {
 *     if (isHttpResponseError<ApiError>(err)) {
 *         // err.response.body is typed as ApiError
 *         console.log(err.response.body.code);
 *     }
 * }
 * ```
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
     *
     * @typeParam TBody - The expected shape of the parsed response body.
     *   The parsed body is cast to this type without runtime validation.
     * @param response - The raw {@link Response} to snapshot.
     * @param request - The raw {@link Request} to snapshot.
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
 * Type guard to check if an error is an {@link HttpResponseError}.
 * Useful for narrowing error types in catch blocks.
 *
 * @typeParam TBody - Optional type parameter to narrow the response body.
 *   No runtime validation of the body shape is performed — this is purely
 *   a compile-time convenience for callers who know the expected body type.
 * @param error - The error to check.
 * @returns `true` if the error is an HttpResponseError.
 *
 * @example
 * ```ts
 * try {
 *     await fetchData();
 * } catch (error) {
 *     if (isHttpResponseError(error)) {
 *         console.log(`Request failed with status ${error.status}`);
 *         console.log(`URL: ${error.request.url}`);
 *     }
 * }
 * ```
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
