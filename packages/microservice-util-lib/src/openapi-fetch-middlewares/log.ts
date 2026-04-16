import type { Middleware } from 'openapi-fetch';
import { parseBody } from './utils/body-parser';
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
                body: await parseBody(request.clone(), contentType),
            });
        },

        async onResponse({ response }) {
            const contentType = response.headers.get('Content-Type');
            log(`Response from ${clientName}`, {
                status: response.status,
                body: await parseBody(response.clone(), contentType),
            });
        },
    };
}

export { logMiddleware };
export type { Logger, LogLevel };
