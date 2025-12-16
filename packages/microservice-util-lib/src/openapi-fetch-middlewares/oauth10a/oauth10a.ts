import crypto from 'crypto';
import { rfc3986, sign } from 'oauth-sign';
import { MiddlewareCallbackParams } from 'openapi-fetch';
import { OAuth10a } from '../authentications';

/**
 * Determines whether a given URL is absolute.
 *
 * A URL is considered absolute if it begins with a scheme (e.g., "http://", "https://")
 * or is protocol-relative (e.g., "//example.com").
 * RFC 3986 defines scheme name as a sequence of characters beginning with a letter
 * and followed by any combination of letters, digits, plus, period, or hyphen.
 *
 * @param {string} url - The URL to check.
 * @returns {boolean} `true` if the URL is absolute, otherwise `false`.
 *
 * @example
 * isAbsoluteURL('https://example.com'); // true
 * isAbsoluteURL('//example.com'); // true
 * isAbsoluteURL('/relative/path'); // false
 */
function isAbsoluteURL(url: string): boolean {
    return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}

/**
 * Combines a base URL and a relative URL into a single URL.
 *
 * @param {string} baseURL - The base URL.
 * @param {string} relativeURL - The relative URL to combine with the base URL.
 * @returns {string} The combined URL.
 *
 * @example
 * combineURLs('https://example.com', '/path'); // 'https://example.com/path'
 */
function combineURLs(baseURL: string, relativeURL: string): string {
    return relativeURL
        ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
}

/**
 * Replaces placeholders in a URL with corresponding values from the path parameters.
 *
 * @param {string} url - The URL containing placeholders (e.g., `{id}`).
 * @param {Record<string, unknown>} [pathParams] - The path parameters to replace in the URL.
 * @returns {string} The URL with placeholders replaced by actual values.
 *
 * @example
 * combineUrlAndPathParams('/users/{id}', { id: 123 }); // '/users/123'
 */
function combineUrlAndPathParams(url: string, pathParams?: Record<string, unknown>): string {
    if (!pathParams) {
        return url;
    }

    for (const [key, value] of Object.entries(pathParams)) {
        url = url.replace(`{${key}}`, String(value));
    }

    return url;
}

/**
 * Processes a URL for OAuth 1.0a by removing unnecessary parts and preparing it for signing.
 *
 * @param {string} baseURL - The base URL.
 * @param {string} url - The URL to process.
 * @returns The processed URL.
 */
function getOAuthUrl(baseURL: string, url: string) {
    const oauthUrl = new URL(!baseURL || isAbsoluteURL(url) ? url : combineURLs(baseURL, url));

    oauthUrl.search = ''; // Query parameters are hashed as part of params rather than as part of the URL
    oauthUrl.hash = ''; // Do not include hash in signature

    // Remove port if it is the default for that protocol
    if (
        (oauthUrl.protocol === 'https:' && oauthUrl.port === '443') ||
        (oauthUrl.protocol === 'http:' && oauthUrl.port === '80')
    ) {
        oauthUrl.port = '';
    }

    return oauthUrl.toString();
}

/**
 * Adds a parameter to the list of parameters to sign.
 *
 * @param {Record<string, string | string[]>} paramsToSign - The parameters to sign.
 * @param {string} key - The key of the parameter.
 * @param {string} value - The value of the parameter.
 */
function addParamToSign(
    paramsToSign: Record<string, string | string[]>,
    key: string,
    value: string
): void {
    const existingValue = paramsToSign[key];

    if (typeof existingValue === 'string') {
        paramsToSign[key] = [existingValue, value];
    } else if (Array.isArray(existingValue)) {
        existingValue.push(value);
    } else {
        paramsToSign[key] = value;
    }
}

/**
 * Adds multiple parameters to the list of parameters to sign.
 *
 * @param {Record<string, string | string[]>} paramsToSign - The parameters to sign.
 * @param {URLSearchParams | Record<string, unknown> | string} params - The parameters to add.
 */
function addParamsToSign(
    paramsToSign: Record<string, string | string[]>,
    params: URLSearchParams | Record<string, unknown> | string
) {
    // Ensure `params` is compatible with `URLSearchParams`
    const normalizedParams =
        typeof params === 'string' || params instanceof URLSearchParams
            ? params
            : Object.entries(params).reduce<Record<string, string | string[]>>(
                  (acc, [key, value]) => {
                      acc[key] = Array.isArray(value) ? value.map(String) : String(value);
                      return acc;
                  },
                  {}
              );

    new URLSearchParams(normalizedParams).forEach((value, key) => {
        addParamToSign(paramsToSign, key, value);
    });
}

/**
 * Determines whether a body hash should be generated for the request.
 *
 * @param {string} body - The request body.
 * @param {string} method - The HTTP method.
 * @param {OAuth10a['includeBodyHash']} includeBodyHash - The body hash inclusion setting.
 * @returns {boolean} `true` if a body hash should be generated, otherwise `false`.
 */
function shouldGenerateBodyHash(
    body: string,
    method: string,
    includeBodyHash: OAuth10a['includeBodyHash']
): boolean {
    if (includeBodyHash === 'auto' && ['POST', 'PUT'].includes(method) && body) {
        return true;
    }

    return includeBodyHash === true;
}

/**
 * Generates OAuth 1.0a parameters for signing a request.
 *
 * @param {MiddlewareCallbackParams['request']} request - The request object.
 * @param {MiddlewareCallbackParams['options']} options - The options object.
 * @param {MiddlewareCallbackParams['params']} params - The parameters object.
 * @param {OAuth10a} config - The OAuth 1.0a configuration.
 * @returns {Promise<string>} The generated OAuth 1.0a Authorization header.
 */
export async function generateOauthParams(
    request: MiddlewareCallbackParams['request'],
    options: MiddlewareCallbackParams['options'],
    params: MiddlewareCallbackParams['params'],
    config: OAuth10a
): Promise<string> {
    const { algorithm, includeBodyHash = 'auto', realm, callback, verifier } = config;
    const { consumerKey, consumerSecret, token, tokenSecret } = await config.credentials();

    const method = (request.method || 'GET').toUpperCase();
    const url = combineUrlAndPathParams(request.url, params.path);

    const oauthParams: Record<string, string> = {
        oauth_consumer_key: consumerKey,
        oauth_nonce: crypto.randomUUID(),
        oauth_signature_method: algorithm,
        oauth_timestamp: String(Math.floor(Date.now() * 0.001)),
        oauth_version: '1.0',
    };

    // if provided, oauth_token can be included in the oauth parameters
    // more information: https://datatracker.ietf.org/doc/html/rfc5849#section-3.1
    if (token) {
        oauthParams.oauth_token = token;
    }

    if (callback) {
        oauthParams.oauth_callback = callback;
    }

    if (verifier) {
        oauthParams.oauth_verifier = verifier;
    }

    const paramsToSign: Record<string, string | string[]> = {};

    addParamsToSign(paramsToSign, oauthParams);

    if (params.query) {
        addParamsToSign(paramsToSign, params.query);
    }

    const body = await request.text();

    // If user submit a form, then include form parameters in the
    // signature as parameters rather than the body hash
    if (request.headers.get('Content-Type') === 'application/x-www-form-urlencoded') {
        addParamsToSign(paramsToSign, new URLSearchParams(body));
        console.log(JSON.stringify(paramsToSign));
    } else {
        if (shouldGenerateBodyHash(body, method, includeBodyHash)) {
            const bodyHash = crypto
                .createHash(algorithm === 'HMAC-SHA1' ? 'sha1' : 'sha256')
                .update(Buffer.from(body))
                .digest('base64');
            oauthParams.oauth_body_hash = bodyHash;
            addParamToSign(paramsToSign, 'oauth_body_hash', bodyHash);
        }
    }

    const oauthUrl = getOAuthUrl(options.baseUrl, url);
    oauthParams.oauth_signature = sign(
        algorithm,
        method,
        oauthUrl,
        paramsToSign,
        consumerSecret,
        tokenSecret
    );

    // realm should not be included in the signature calculation
    // but is optional in the OAuth 1.0 Authorization header
    // so we need to add it after signing the request
    // more information: https://datatracker.ietf.org/doc/html/rfc5849#section-3.4.1.3.1
    if (realm) {
        oauthParams.realm = realm;
    }

    return Object.entries(oauthParams)
        .map(e => [e[0], '="', rfc3986(e[1]), '"'].join(''))
        .join(',');
}
