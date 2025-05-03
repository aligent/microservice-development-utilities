import type { Middleware } from 'openapi-fetch';
import { generateOauthParams } from './oauth10a/oauth10a';
import type { ApiKey, Basic, OAuth10a, OAuth20 } from './types/authentications';

/**
 * Creates an openapi-fetch middleware for API key authentication.
 * This middleware sets the API key in the specified header for each request.
 *
 * @param {ApiKey} config - The configuration for API key authentication.
 * @returns {Middleware} The middleware for API key authentication.
 *
 * @example
 * const middleware = apiKeyAuthMiddleware({
 *     header: 'x-api-key',
 *     value: async () => 'your-api-key',
 * });
 */
function apiKeyAuthMiddleware(config: ApiKey): Middleware {
    return {
        onRequest: async ({ request }) => {
            request.headers.set(config.header, await config.value());
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
 * const middleware = basicAuthMiddleware({
 *     credentials: async () => ({ username: 'user', password: 'pass' }),
 * });
 */
function basicAuthMiddleware(config: Basic): Middleware {
    return {
        onRequest: async ({ request }) => {
            const { username, password } = await config.credentials();

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
 * const middleware = oAuth10aAuthMiddleware({
 *     algorithm: 'HMAC-SHA256',
 *     credentials: async () => ({
 *         consumerKey: 'key',
 *         consumerSecret: 'secret',
 *         token: 'token',
 *         tokenSecret: 'tokenSecret',
 *     }),
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
 * const middleware = oAuth20AuthMiddleware({
 *     token: async () => 'your-access-token',
 *     tokenType: 'Bearer',
 * });
 */
function oAuth20AuthMiddleware(options: OAuth20): Middleware {
    return {
        onRequest: async ({ request }) => {
            const { tokenType = 'Bearer' } = options;

            request.headers.set('Authorization', `${tokenType} ${await options.token()}`);
        },
    };
}

export type { ApiKey, Basic, OAuth10a, OAuth20 };

export { apiKeyAuthMiddleware, basicAuthMiddleware, oAuth10aAuthMiddleware, oAuth20AuthMiddleware };
