import { Logger } from '@aws-lambda-powertools/logger';
import {
    GetParameterCommand,
    GetParametersCommand,
    paginateGetParametersByPath,
    Parameter,
    SSMClient,
} from '@aws-sdk/client-ssm';
import { captureAWSv3Client } from 'aws-xray-sdk-core';

/**
 * Wrapper around the AWS SSM Parameter Store client providing structured
 * Powertools logging and X-Ray tracing by default. All operations enable
 * `WithDecryption` — callers needing plaintext should use `SSMClient`
 * directly.
 */
export class SSMService {
    private readonly client: SSMClient;
    private readonly logger: Logger;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to a logger with
     * `serviceName: 'SSMService'`.
     * @param opts.client - Optional pre-configured `SSMClient`. When supplied,
     * the wrapper does not apply X-Ray instrumentation.
     */
    constructor(opts?: { logger?: Logger; client?: SSMClient }) {
        this.client = opts?.client ?? captureAWSv3Client(new SSMClient());
        this.logger = opts?.logger ?? new Logger({ serviceName: 'SSMService' });
    }

    /**
     * Fetch a single SSM parameter's value.
     * @param name - The parameter name (or ARN).
     * @returns The parameter value, or `undefined` if the parameter has no
     * value set.
     */
    async getParameter(name: string): Promise<string | undefined> {
        this.logger.info('Fetching SSM parameter', { input: { name } });
        const response = await this.client.send(
            new GetParameterCommand({ Name: name, WithDecryption: true })
        );
        return response.Parameter?.Value;
    }

    /**
     * Fetch multiple SSM parameters in a single request. The returned record
     * is keyed by parameter name so callers can destructure:
     * `const { foo, bar } = await ssm.getParameters(['foo', 'bar']);`.
     * @param names - The parameter names (or ARNs) to fetch.
     * @returns A record mapping each requested name to its value, or
     * `undefined` when the parameter is missing or has no value.
     */
    async getParameters(names: string[]): Promise<Record<string, string | undefined>> {
        this.logger.info('Fetching SSM parameters', { input: { names } });
        const response = await this.client.send(
            new GetParametersCommand({ Names: names, WithDecryption: true })
        );
        const byName = new Map<string, string | undefined>(
            response.Parameters?.map(p => [p.Name as string, p.Value]) ?? []
        );
        return Object.fromEntries(names.map(name => [name, byName.get(name)]));
    }

    /**
     * Fetch all parameters under an SSM hierarchy path, auto-paginating across
     * all pages. `Recursive` defaults to `true` (overriding the AWS SDK
     * default of `false`) to match the typical "load all config under
     * `/myapp/`" use case.
     * @param path - The parameter path prefix (e.g. `/myapp/`).
     * @param opts.recursive - Whether to recurse into nested paths. Defaults
     * to `true`.
     * @returns The full `Parameter` objects (including `Version`,
     * `LastModifiedDate`, etc.).
     */
    async getParametersByPath(path: string, opts?: { recursive?: boolean }): Promise<Parameter[]> {
        const recursive = opts?.recursive ?? true;
        this.logger.info('Fetching SSM parameters by path', {
            input: { path, recursive },
        });
        const paginator = paginateGetParametersByPath(
            { client: this.client },
            { Path: path, Recursive: recursive, WithDecryption: true }
        );
        const parameters: Parameter[] = [];
        for await (const page of paginator) {
            parameters.push(...(page.Parameters ?? []));
        }
        return parameters;
    }
}
