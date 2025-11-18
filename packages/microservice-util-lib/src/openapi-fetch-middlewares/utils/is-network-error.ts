/**
 * This is a Typescript copy of the amazing work from Sindre Sorhus
 * https://github.com/sindresorhus/is-network-error
 */

const ERROR_MESSAGES = new Set([
    'network error', // Chrome
    'Failed to fetch', // Chrome
    'NetworkError when attempting to fetch resource.', // Firefox
    'The Internet connection appears to be offline.', // Safari 16
    'Network request failed', // `cross-fetch`
    'fetch failed', // Undici (Node.js)
    'terminated', // Undici (Node.js)
    ' A network error occurred.', // Bun (WebKit)
    'Network connection lost', // Cloudflare Workers (fetch)
]);

function isError(object: unknown): object is Error {
    return Object.prototype.toString.call(object) === '[object Error]';
}

export function isNetworkError(error: unknown): error is TypeError {
    const isValid =
        error && isError(error) && error.name === 'TypeError' && typeof error.message === 'string';

    if (!isValid) {
        return false;
    }

    const { message, stack } = error;

    // Safari 17+ has generic message but no stack for network errors
    if (message === 'Load failed') {
        return (
            stack === undefined ||
            // Sentry adds its own stack trace to the fetch error, so also check for that
            '__sentry_captured__' in error
        );
    }

    // Deno network errors start with specific text
    if (message.startsWith('error sending request for url')) {
        return true;
    }

    // Standard network error messages
    return ERROR_MESSAGES.has(message);
}
