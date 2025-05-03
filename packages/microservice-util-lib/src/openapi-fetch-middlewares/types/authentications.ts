/**
 * Represents an API key authentication method.
 *
 * This interface is used for API key-based authentication, where the key is sent
 * in a specific header. The value of the API key is retrieved asynchronously.
 *
 * @interface ApiKey
 * @property {string} header - The header name where the API key will be set.
 * @property {() => Promise<string>} value - A function that returns a promise resolving to the API key value.
 */
export interface ApiKey {
    header: string;
    value: () => Promise<string>;
}

/**
 * Represents basic authentication credentials.
 *
 * This interface is used for basic authentication, where the username and password
 * are retrieved asynchronously.
 *
 * @interface Basic
 * @property {() => Promise<{ username: string; password: string }>} credentials - A function that returns a promise resolving to the username and password.
 */
export interface Basic {
    credentials: () => Promise<{ username: string; password: string }>;
}

/**
 * Represents OAuth 1.0a authentication credentials.
 *
 * This interface is used for OAuth 1.0a authentication, where the consumer key, consumer secret,
 * token, and token secret are retrieved asynchronously. It also supports optional parameters
 * like body hash inclusion, realm, callback, and verifier.
 *
 * @interface OAuth10a
 * @property {'HMAC-SHA1' | 'HMAC-SHA256'} algorithm - The signing algorithm to use.
 * @property {() => Promise<{ consumerKey: string; consumerSecret: string; token?: string; tokenSecret: string }>} credentials - A function that returns a promise resolving to the OAuth 1.0a credentials.
 * @property {boolean | 'auto'} [includeBodyHash] - Whether to include a body hash in the signature. Defaults to 'auto'.
 * @property {string} [realm] - The realm parameter for the Authorization header.
 * @property {string} [callback] - The callback URL for OAuth 1.0a.
 * @property {string} [verifier] - The verifier for OAuth 1.0a.
 */
export interface OAuth10a {
    algorithm: 'HMAC-SHA1' | 'HMAC-SHA256';
    credentials: () => Promise<{
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
 * This interface is used for OAuth 2.0 authentication, where an access token is retrieved
 * asynchronously. It also supports an optional token type (e.g., 'Bearer').
 *
 * @interface OAuth20
 * @property {() => Promise<string>} token - A function that returns a promise resolving to the access token.
 * @property {string} [tokenType] - The type of the token (e.g., 'Bearer'). Defaults to 'Bearer' if not specified.
 */
export interface OAuth20 {
    token: () => Promise<string>;
    tokenType?: string;
}
