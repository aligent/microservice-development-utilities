import { Logger } from '@aws-lambda-powertools/logger';
import {
    DeleteParameterCommand,
    GetParameterCommand,
    GetParametersCommand,
    paginateGetParametersByPath,
    Parameter,
    PutParameterCommand,
    PutParameterCommandInput,
    PutParameterCommandOutput,
    SSMClient,
} from '@aws-sdk/client-ssm';
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import { filterFieldsForLogLevel } from '../util/redact';

/**
 * Fields safe to log at INFO level for `putParameter`. Omits `Value` (the
 * parameter content itself). `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the full
 * input.
 */
const PUT_PARAMETER_SAFE_FIELDS: ReadonlyArray<keyof PutParameterCommandInput> = [
    'Name',
    'Type',
    'Description',
    'KeyId',
    'Overwrite',
    'AllowedPattern',
    'Tags',
    'Tier',
    'Policies',
    'DataType',
];

/**
 * Wrapper around the AWS SSM Parameter Store client providing structured
 * Powertools logging and X-Ray tracing by default. All read operations enable
 * `WithDecryption` — callers needing plaintext should use `SSMClient`
 * directly.
 *
 * Write operations (`putParameter`, `deleteParameter`) are exposed for
 * convenience but should be used with care: parameter lifecycle is usually
 * managed by IaC (CDK / Terraform). Prefer IaC for anything that exists at
 * deploy time; reserve runtime writes for values that genuinely need to
 * mutate within the application.
 */
export class SSMService {
    private readonly client: SSMClient;
    private readonly logger: Logger;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `SSMClient`. When supplied,
     * the wrapper does not apply X-Ray instrumentation.
     */
    constructor(opts?: { logger?: Logger; client?: SSMClient }) {
        this.client = opts?.client ?? captureAWSv3Client(new SSMClient());
        this.logger = opts?.logger ?? new Logger();
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
     * Fetch multiple SSM parameters in a single request. Callers supply an
     * alias-to-path record, and the returned record is keyed by the same
     * aliases — so the SSM path is only mentioned at the call site and the
     * destructured names are whatever the caller wants to use locally:
     *
     * ```ts
     * const { username, password } = await ssm.getParameters({
     *     username: '/myapp/db/username',
     *     password: '/myapp/db/password',
     * });
     * ```
     *
     * @param aliases - Record mapping each desired local alias to its SSM
     * parameter name (or ARN).
     * @returns A record keyed by the same aliases, mapping each to the
     * parameter's value, or `undefined` when the parameter is missing or has
     * no value.
     */
    async getParameters<K extends string>(
        aliases: Record<K, string>
    ): Promise<Record<K, string | undefined>> {
        this.logger.info('Fetching SSM parameters', { input: { aliases } });
        const response = await this.client.send(
            new GetParametersCommand({
                Names: Object.values(aliases),
                WithDecryption: true,
            })
        );
        const byPath = new Map<string, string | undefined>();
        for (const parameter of response.Parameters ?? []) {
            if (parameter.Name !== undefined) byPath.set(parameter.Name, parameter.Value);
        }
        const result = {} as Record<K, string | undefined>;
        for (const alias of Object.keys(aliases) as K[]) {
            result[alias] = byPath.get(aliases[alias]);
        }
        return result;
    }

    /**
     * Create or update an SSM parameter. The log line omits `Value` to avoid
     * leaking secret material.
     *
     * Prefer IaC (CDK / Terraform) for parameter lifecycle — use this for
     * runtime values only.
     */
    async putParameter(input: PutParameterCommandInput): Promise<PutParameterCommandOutput> {
        this.logger.info('Putting SSM parameter', {
            input: filterFieldsForLogLevel(this.logger, input, PUT_PARAMETER_SAFE_FIELDS),
        });
        return this.client.send(new PutParameterCommand(input));
    }

    /**
     * Delete an SSM parameter by name.
     *
     * Prefer IaC (CDK / Terraform) for parameter lifecycle — use this for
     * runtime cleanup only.
     */
    async deleteParameter(name: string): Promise<void> {
        this.logger.info('Deleting SSM parameter', { input: { name } });
        await this.client.send(new DeleteParameterCommand({ Name: name }));
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
