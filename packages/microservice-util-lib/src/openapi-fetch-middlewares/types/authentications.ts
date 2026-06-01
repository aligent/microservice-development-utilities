/**
 * A value that can be provided either statically or as a function (sync or async).
 * Used by authentication config interfaces to allow both static credentials
 * and dynamic credential retrieval (e.g., from a secrets manager).
 *
 * @example
 * // Static value
 * const value: Resolvable<string> = 'my-api-key';
 *
 * // Sync function
 * const value: Resolvable<string> = () => getKey();
 *
 * // Async function
 * const value: Resolvable<string> = async () => await fetchKey();
 */
export type Resolvable<T> = T | (() => T | Promise<T>);

/**
 * Represents an API key authentication method.
 *
 * This interface is used for API key-based authentication, where the key is sent
 * in a specific header. The value can be a static string or a function that returns one.
 *
 * @interface ApiKey
 * @property {string} header - The header name where the API key will be set.
 * @property {Resolvable<string>} value - The API key value, or a function returning it.
 */
export interface ApiKey {
    header: string;
    value: Resolvable<string>;
}

/**
 * Represents basic authentication credentials.
 *
 * This interface is used for basic authentication, where the username and password
 * can be provided statically or retrieved dynamically via a function.
 *
 * @interface Basic
 * @property {Resolvable<{ username: string; password: string }>} credentials - The credentials, or a function returning them.
 */
export interface Basic {
    credentials: Resolvable<{ username: string; password: string }>;
}

/**
 * Represents OAuth 1.0a authentication credentials.
 *
 * This interface is used for OAuth 1.0a authentication, where the consumer key, consumer secret,
 * token, and token secret can be provided statically or retrieved dynamically via a function.
 * It also supports optional parameters like body hash inclusion, realm, callback, and verifier.
 *
 * @interface OAuth10a
 * @property {'HMAC-SHA1' | 'HMAC-SHA256'} algorithm - The signing algorithm to use.
 * @property {Resolvable<{ consumerKey: string; consumerSecret: string; token?: string; tokenSecret: string }>} credentials - The OAuth 1.0a credentials, or a function returning them.
 * @property {boolean | 'auto'} [includeBodyHash] - Whether to include a body hash in the signature. Defaults to 'auto'.
 * @property {string} [realm] - The realm parameter for the Authorization header.
 * @property {string} [callback] - The callback URL for OAuth 1.0a.
 * @property {string} [verifier] - The verifier for OAuth 1.0a.
 */
export interface OAuth10a {
    algorithm: 'HMAC-SHA1' | 'HMAC-SHA256';
    credentials: Resolvable<{
        consumerKey: string;
        consumerSecret: string;
        token?: string;
        tokenSecret: string;
    }>;
    includeBodyHash?: boolean | 'auto';
    realm?: string;
    callback?: string;
    verifier?: string;
}

/**
 * Represents OAuth 2.0 authentication credentials.
 *
 * This interface is used for OAuth 2.0 authentication, where an access token can be
 * provided statically or retrieved dynamically via a function.
 * It also supports an optional token type (e.g., 'Bearer').
 *
 * @interface OAuth20
 * @property {Resolvable<string>} token - The access token, or a function returning it.
 * @property {string} [tokenType] - The type of the token (e.g., 'Bearer'). Defaults to 'Bearer' if not specified.
 */
export interface OAuth20 {
    token: Resolvable<string>;
    tokenType?: string;
}
