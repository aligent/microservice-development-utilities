import type { Middleware } from 'openapi-fetch';

/**
 * Logger interface to support various logging implementations
 * (console, winston, pino, bunyan, etc.)
 */
interface Logger {
    info(message: string, ...args: unknown[]): void;
    debug?(message: string, ...args: unknown[]): void;
}

type LogLevel = 'INFO' | 'DEBUG';

/**
 * Parse request/response body based on Content-Type header
 */
async function parseBody(source: Request | Response, contentType: string | null): Promise<unknown> {
    if (!contentType) {
        // No content-type, try JSON as default
        try {
            return await source.clone().json();
        } catch {
            return '[Unable to parse body]';
        }
    }

    const normalizedContentType = contentType.toLowerCase();

    try {
        // JSON content
        if (normalizedContentType.includes('application/json')) {
            return await source.clone().json();
        }

        // Text content
        if (
            normalizedContentType.includes('text/') ||
            normalizedContentType.includes('application/xml') ||
            normalizedContentType.includes('application/x-www-form-urlencoded')
        ) {
            return await source.clone().text();
        }

        // Binary or multipart content - don't parse
        if (
            normalizedContentType.includes('multipart/form-data') ||
            normalizedContentType.includes('application/octet-stream') ||
            normalizedContentType.includes('image/') ||
            normalizedContentType.includes('video/') ||
            normalizedContentType.includes('audio/')
        ) {
            return `[Binary content: ${contentType}]`;
        }

        // Unknown content type, try JSON as default
        return await source.clone().json();
    } catch (error) {
        return `[Unable to parse body: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
}

/**
 * Creates a logging middleware for openapi-fetch clients.
 *
 * This middleware logs HTTP requests and responses with Content-Type handling.
 * It supports various logger implementations and configurable log levels (INFO or DEBUG).
 *
 * Features:
 * - Automatic Content-Type detection and appropriate parsing
 * - Support for JSON, text, XML, form data, and binary content
 * - Configurable log levels (INFO/DEBUG)
 * - Compatible with multiple logging libraries
 *
 * @param clientName - A descriptive name for the API client (used in log messages)
 * @param logLevel - The logging level to use: 'INFO' (default) or 'DEBUG'
 * @param logger - Logger instance implementing the Logger interface (defaults to console)
 * @returns An openapi-fetch middleware that logs requests and responses
 *
 * @example
 * ```typescript
 * // Basic usage with default console logger at INFO level
 * import createClient from 'openapi-fetch';
 *
 * const client = createClient({ baseUrl: 'https://api.example.com' });
 * client.use(logMiddleware('MyAPI'));
 * ```
 *
 * @example
 * ```typescript
 * // Using DEBUG level with console
 * client.use(logMiddleware('MyAPI', 'DEBUG'));
 * ```
 *
 * @example
 * ```typescript
 * // Custom logger implementation
 * const customLogger = {
 *   info: (msg, ...args) => console.log('[INFO]', msg, ...args),
 *   debug: (msg, ...args) => console.log('[DEBUG]', msg, ...args)
 * };
 *
 * client.use(logMiddleware('MyAPI', 'DEBUG', customLogger));
 * ```
 */
function logMiddleware(
    clientName: string,
    logLevel: LogLevel = 'INFO',
    logger: Logger = console
): Middleware {
    const log = (message: string, ...args: unknown[]) => {
        if (logLevel === 'DEBUG' && logger.debug) {
            logger.debug(message, ...args);
            return;
        }

        logger.info(message, ...args);
    };

    return {
        async onRequest({ options, params, request }) {
            const contentType = request.headers.get('Content-Type');
            log(`${request.method} request to ${clientName}`, {
                method: request.method,
                baseUrl: options.baseUrl,
                url: request.url,
                params: params,
                body: await parseBody(request, contentType),
            });
        },

        async onResponse({ response }) {
            const contentType = response.headers.get('Content-Type');
            log(`Response from ${clientName}`, {
                status: response.status,
                body: await parseBody(response, contentType),
            });
        },
    };
}

export { logMiddleware };
export type { Logger, LogLevel };
