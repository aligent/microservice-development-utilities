import type { Middleware } from 'openapi-fetch';
import { generateOauthParams, resignOauth10aRequest } from './oauth10a/oauth10a';
import type { ApiKey, Basic, OAuth10a, OAuth20, Resolvable } from './types/authentications';

/**
 * Resolves a `Resolvable<T>` value to its underlying type.
 * If the value is a function, it is called and awaited; otherwise, it is returned as-is.
 *
 * @param {Resolvable<T>} value - The resolvable value.
 * @returns {Promise<T>} The resolved value.
 */
async function resolve<T>(value: Resolvable<T>): Promise<T> {
    return typeof value === 'function' ? await (value as () => T | Promise<T>)() : value;
}

/**
 * Creates an openapi-fetch middleware for API key authentication.
 * This middleware sets the API key in the specified header for each request.
 *
 * @param {ApiKey} config - The configuration for API key authentication.
 * @returns {Middleware} The middleware for API key authentication.
 *
 * @example
 * // Static value
 * const middleware = apiKeyAuthMiddleware({
 *     header: 'x-api-key',
 *     value: 'your-api-key',
 * });
 *
 * @example
 * // Dynamic value (async function)
 * const middleware = apiKeyAuthMiddleware({
 *     header: 'x-api-key',
 *     value: async () => fetchApiKey(),
 * });
 */
function apiKeyAuthMiddleware(config: ApiKey): Middleware {
    return {
        onRequest: async ({ request }) => {
            request.headers.set(config.header, await resolve(config.value));
        },
    };
}

/**
 * Creates an openapi-fetch middleware for Basic authentication.
 * This middleware sets the `Authorization` header with the Basic authentication credentials
 * (username and password) for each request.
 *
 * @param {Basic} config - The configuration for Basic authentication.
 * @returns {Middleware} The middleware for Basic authentication.
 *
 * @example
 * // Static credentials
 * const middleware = basicAuthMiddleware({
 *     credentials: { username: 'user', password: 'pass' },
 * });
 *
 * @example
 * // Dynamic credentials (async function)
 * const middleware = basicAuthMiddleware({
 *     credentials: async () => fetchCredentials(),
 * });
 */
function basicAuthMiddleware(config: Basic): Middleware {
    return {
        onRequest: async ({ request }) => {
            const { username, password } = await resolve(config.credentials);

            request.headers.set(
                'Authorization',
                `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
            );
        },
    };
}

/**
 * Creates an openapi-fetch middleware for OAuth 1.0a authentication.
 * This middleware generates OAuth 1.0a parameters and sets the `Authorization` header
 * for each request.
 *
 * @param {OAuth10a} config - The configuration for OAuth 1.0a authentication.
 * @returns {Middleware} The middleware for OAuth 1.0a authentication.
 *
 * @example
 * // Static credentials
 * const middleware = oAuth10aAuthMiddleware({
 *     algorithm: 'HMAC-SHA256',
 *     credentials: {
 *         consumerKey: 'key',
 *         consumerSecret: 'secret',
 *         token: 'token',
 *         tokenSecret: 'tokenSecret',
 *     },
 * });
 *
 * @example
 * // Dynamic credentials (async function)
 * const middleware = oAuth10aAuthMiddleware({
 *     algorithm: 'HMAC-SHA256',
 *     credentials: async () => fetchOAuthCredentials(),
 * });
 */
function oAuth10aAuthMiddleware(config: OAuth10a): Middleware {
    return {
        onRequest: async ({ request, options, params }) => {
            const oauthParams = await generateOauthParams(request, options, params, config);

            request.headers.set('Authorization', `OAuth ${oauthParams}`);
        },
    };
}

/**
 * Creates an openapi-fetch middleware for OAuth 2.0 authentication.
 * This middleware sets the `Authorization` header with the OAuth 2.0 token for each request.
 *
 * @param {OAuth20} options - The configuration for OAuth 2.0 authentication.
 * @returns {Middleware} The middleware for OAuth 2.0 authentication.
 *
 * @example
 * // Static token
 * const middleware = oAuth20AuthMiddleware({
 *     token: 'your-access-token',
 *     tokenType: 'Bearer',
 * });
 *
 * @example
 * // Dynamic token (async function)
 * const middleware = oAuth20AuthMiddleware({
 *     token: async () => fetchAccessToken(),
 *     tokenType: 'Bearer',
 * });
 */
function oAuth20AuthMiddleware(options: OAuth20): Middleware {
    return {
        onRequest: async ({ request }) => {
            const { tokenType = 'Bearer' } = options;

            request.headers.set('Authorization', `${tokenType} ${await resolve(options.token)}`);
        },
    };
}

export { resolve };
export type { ApiKey, Basic, OAuth10a, OAuth20, Resolvable };

export {
    apiKeyAuthMiddleware,
    basicAuthMiddleware,
    oAuth10aAuthMiddleware,
    oAuth20AuthMiddleware,
    resignOauth10aRequest,
};
