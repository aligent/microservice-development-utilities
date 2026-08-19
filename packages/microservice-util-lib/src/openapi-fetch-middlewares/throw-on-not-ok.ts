import type { Middleware } from 'openapi-fetch';
import { HttpResponseError } from './utils/http-response-error';

/**
 * Throws an {@link HttpResponseError} when a response has a non-OK status (i.e. not 2xx).
 *
 * Register this when the caller should handle failures as exceptions rather than
 * inspecting `error` on the returned union — notably when using
 * `createErrorThrowingClient`, whose type guarantee depends on it.
 *
 * openapi-fetch runs `onResponse` in reverse registration order, so middleware
 * registered *after* this one still observes the failing response before the throw:
 *
 * @example
 * // logMiddleware logs the 500, then throwOnNotOk raises it to the caller
 * client.use(throwOnNotOk(), logMiddleware('MyApi', logger));
 *
 * @returns {Middleware} The middleware for throwing on non-OK responses.
 */
export function throwOnNotOk(): Middleware {
    return {
        async onResponse({ request, response }) {
            if (!response.ok) {
                throw await HttpResponseError.create(response, request);
            }

            return response;
        },
    };
}
