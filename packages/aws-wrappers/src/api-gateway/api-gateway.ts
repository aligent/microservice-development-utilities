import { Logger } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';
import {
    APIGatewayClient,
    ApiKey,
    GetApiKeyCommand,
    GetApiKeyCommandInput,
    GetApiKeyCommandOutput,
    GetApiKeysCommandInput,
    GetResourcesCommandInput,
    GetRestApisCommandInput,
    paginateGetApiKeys,
    paginateGetResources,
    paginateGetRestApis,
    Resource,
    RestApi,
} from '@aws-sdk/client-api-gateway';
import xray from 'aws-xray-sdk-core';

/**
 * Read-only wrapper around the API Gateway (REST API, v1) control-plane client
 * providing structured Powertools logging and X-Ray tracing by default.
 *
 * `getApiKeys` and `getApiKey` always request key values (`includeValues` /
 * `includeValue` is `true`, with no opt-out) — callers needing metadata only
 * should use `APIGatewayClient` directly. Key values appear only in method
 * output; the wrapper never logs output, and no input carries secrets.
 */
export class APIGatewayService {
    private readonly client: APIGatewayClient;
    private readonly logger: LoggerInterface;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `APIGatewayClient`. When
     * supplied, the wrapper does not apply X-Ray instrumentation.
     */
    constructor(opts?: { logger?: LoggerInterface; client?: APIGatewayClient }) {
        this.client = opts?.client ?? xray.captureAWSv3Client(new APIGatewayClient());
        this.logger = opts?.logger ?? new Logger();
    }

    /**
     * List every REST API in the account and region. Auto-paginated.
     */
    async getRestApis(input: GetRestApisCommandInput = {}): Promise<RestApi[]> {
        this.logger.info('Fetching REST APIs', { input });
        return collectItems(paginateGetRestApis({ client: this.client }, input));
    }

    /**
     * List API keys, including their secret values. Auto-paginated.
     */
    async getApiKeys(input: Omit<GetApiKeysCommandInput, 'includeValues'> = {}): Promise<ApiKey[]> {
        this.logger.info('Fetching API keys', { input });
        return collectItems(
            paginateGetApiKeys({ client: this.client }, { ...input, includeValues: true })
        );
    }

    /**
     * Fetch a single API key, including its secret value.
     * @throws NotFoundException when the key does not exist.
     */
    async getApiKey(
        input: Omit<GetApiKeyCommandInput, 'includeValue'>
    ): Promise<GetApiKeyCommandOutput> {
        this.logger.info('Fetching API key', { input });
        return this.client.send(new GetApiKeyCommand({ ...input, includeValue: true }));
    }

    /**
     * List every resource (path) of a REST API, which is how REST APIs expose
     * their routes. Pass `embed: ['methods']` to include each resource's
     * methods. Auto-paginated.
     */
    async getResources(input: GetResourcesCommandInput): Promise<Resource[]> {
        this.logger.info('Fetching REST API resources', { input });
        return collectItems(paginateGetResources({ client: this.client }, input));
    }
}

async function collectItems<T>(pages: AsyncIterable<{ items?: T[] | undefined }>): Promise<T[]> {
    const items: T[] = [];
    for await (const page of pages) {
        items.push(...(page.items ?? []));
    }
    return items;
}
