import { Logger } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';
import {
    Api,
    ApiGatewayV2Client,
    GetApisCommand,
    GetApisCommandInput,
    GetRouteCommand,
    GetRouteCommandInput,
    GetRouteCommandOutput,
    GetRoutesCommand,
    GetRoutesCommandInput,
    Route,
} from '@aws-sdk/client-apigatewayv2';
import xray from 'aws-xray-sdk-core';
import { collectPages } from '../util/pagination.js';

/**
 * Read-only wrapper around the API Gateway v2 (HTTP and WebSocket APIs)
 * control-plane client providing structured Powertools logging and X-Ray
 * tracing by default.
 *
 * The v2 SDK ships no paginators for `GetApis` or `GetRoutes`, so list methods
 * follow `NextToken` manually.
 */
export class APIGatewayV2Service {
    private readonly client: ApiGatewayV2Client;
    private readonly logger: LoggerInterface;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `ApiGatewayV2Client`. When
     * supplied, the wrapper does not apply X-Ray instrumentation.
     */
    constructor(opts?: { logger?: LoggerInterface; client?: ApiGatewayV2Client }) {
        this.client = opts?.client ?? xray.captureAWSv3Client(new ApiGatewayV2Client());
        this.logger = opts?.logger ?? new Logger();
    }

    /**
     * List every HTTP and WebSocket API in the account and region.
     * Auto-paginated.
     */
    async getApis(input: Omit<GetApisCommandInput, 'NextToken'> = {}): Promise<Api[]> {
        this.logger.info('Fetching APIs', { input });
        return collectPages(
            NextToken => this.client.send(new GetApisCommand({ ...input, NextToken })),
            page => page.Items,
            page => page.NextToken
        );
    }

    /**
     * Fetch a single route of an HTTP or WebSocket API.
     * @throws NotFoundException when the route does not exist.
     */
    async getRoute(input: GetRouteCommandInput): Promise<GetRouteCommandOutput> {
        this.logger.info('Fetching API route', { input });
        return this.client.send(new GetRouteCommand(input));
    }

    /**
     * List every route of an HTTP or WebSocket API. Auto-paginated.
     */
    async getRoutes(input: Omit<GetRoutesCommandInput, 'NextToken'>): Promise<Route[]> {
        this.logger.info('Fetching API routes', { input });
        return collectPages(
            NextToken => this.client.send(new GetRoutesCommand({ ...input, NextToken })),
            page => page.Items,
            page => page.NextToken
        );
    }
}
