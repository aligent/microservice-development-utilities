import type {
    LoggerInterface,
    LogLevel,
} from '@aws-lambda-powertools/logger/types';
import type { Middleware } from 'openapi-fetch';
import { parseBody } from './utils/body-parser';

type LogMethod = Exclude<LogLevel, 'SILENT' | 'silent'>;

/**
 * Creates a logging middleware for openapi-fetch clients.
 *
 * This middleware logs HTTP requests and responses with Content-Type handling.
 * It uses Powertools Logger for structured JSON output.
 *
 * Features:
 * - Automatic Content-Type detection and appropriate parsing
 * - Support for JSON, text, XML, form data, and binary content
 * - Configurable log level (defaults to INFO)
 * - Structured JSON logging via Powertools Logger
 *
 * @param clientName - A descriptive name for the API client (used in log messages)
 * @param logger - Logger instance implementing Powertools LoggerInterface
 * @param logLevel - Which logger method to call (defaults to 'INFO')
 * @returns An openapi-fetch middleware that logs requests and responses
 *
 * @example
 * ```typescript
 * import createClient from 'openapi-fetch';
 * import { Logger } from '@aws-lambda-powertools/logger';
 *
 * const logger = new Logger({ serviceName: 'my-service' });
 * const client = createClient({ baseUrl: 'https://api.example.com' });
 * client.use(logMiddleware('MyAPI', logger));
 * ```
 *
 * @example
 * ```typescript
 * // Log at DEBUG level — only visible when the logger is configured for DEBUG
 * client.use(logMiddleware('MyAPI', logger, 'DEBUG'));
 * ```
 */
function logMiddleware(
    clientName: string,
    logger: LoggerInterface,
    logLevel: LogMethod = 'INFO'
): Middleware {
    const method = logLevel.toLowerCase() as Lowercase<LogMethod>;
    const log = logger[method].bind(logger);

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
                contentType,
                body: await parseBody(response.clone(), contentType),
            });
        },
    };
}

export { logMiddleware };
export type { LogMethod };
