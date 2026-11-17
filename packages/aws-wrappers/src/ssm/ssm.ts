import { Logger } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';
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
import xray from 'aws-xray-sdk-core';
import { type BatchFailedEntry, throwIfAny } from '../util/batch-operation-error.js';
import { chunk } from '../util/chunk.js';
import { collectItems } from '../util/pagination.js';
import { redactInput } from '../util/redact.js';

const GET_PARAMETERS_LIMIT = 10;

/**
 * One failed entry per alias whose path SSM reported as invalid, so two
 * aliases sharing a missing path are both named.
 */
function missingParameters(
    aliases: Record<string, string>,
    invalidPaths: ReadonlySet<string>
): BatchFailedEntry[] {
    return Object.entries(aliases)
        .filter(([, path]) => invalidPaths.has(path))
        .map(([alias, path]) => ({
            id: path,
            code: 'ParameterNotFound',
            message: `Parameter not found for alias "${alias}"`,
        }));
}

/**
 * Fields safe to log at INFO level for `putParameter`. Omits `Value` (the
 * parameter content itself).
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
 * Where a method's input carries payloads, secret material or PII, the INFO
 * log line omits them; the verbose levels (`POWERTOOLS_LOG_LEVEL=DEBUG` or
 * `TRACE`) log full SDK inputs.
 *
 * Write operations (`putParameter`, `deleteParameter`) are exposed for
 * convenience but should be used with care: parameter lifecycle is usually
 * managed by IaC (CDK / Terraform). Prefer IaC for anything that exists at
 * deploy time; reserve runtime writes for values that genuinely need to
 * mutate within the application.
 */
export class SSMService {
    private readonly client: SSMClient;
    private readonly logger: LoggerInterface;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `SSMClient`. When supplied,
     * the wrapper does not apply X-Ray instrumentation.
     */
    constructor(opts?: { logger?: LoggerInterface; client?: SSMClient }) {
        this.client = opts?.client ?? xray.captureAWSv3Client(new SSMClient());
        this.logger = opts?.logger ?? new Logger();
    }

    /**
     * Fetch a single SSM parameter's value.
     * @param name - The parameter name (or ARN).
     * @returns The parameter value, or `undefined` if the parameter has no
     * value set.
     * @throws When the parameter does not exist (the SDK's
     * `ParameterNotFound`). {@link SSMService.getParameters} instead returns
     * `undefined` for a missing parameter unless `required` is set.
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
     * The AWS SSM `GetParameters` API caps requests at
     * `GET_PARAMETERS_LIMIT` (10) names per call, so this method auto-chunks
     * the underlying parameter names and sends one request per chunk,
     * merging the results before building the alias-keyed return value.
     *
     * Unlike {@link SSMService.getParameter}, which throws when the parameter
     * does not exist, a missing parameter here maps to `undefined` — so a
     * typo'd path surfaces later as an undefined value. Pass
     * `{ required: true }` to fail fast instead: every chunk is still sent,
     * then a {@link BatchOperationError} is thrown whose `failed` entries
     * carry each missing path as `id`, the code `ParameterNotFound`, and the
     * alias in `message`. Request-level SDK exceptions are not wrapped.
     *
     * @param aliases - Record mapping each desired local alias to its SSM
     * parameter name (or ARN).
     * @param opts.required - Throw when any requested parameter does not
     * exist. Defaults to `false`.
     * @returns A record keyed by the same aliases, mapping each to the
     * parameter's value, or `undefined` when the parameter is missing (unless
     * `required` is set) or has no value.
     */
    async getParameters<K extends string>(
        aliases: Record<K, string>,
        opts?: { required?: boolean }
    ): Promise<Record<K, string | undefined>> {
        this.logger.info('Fetching SSM parameters', { input: { aliases } });
        const names = Object.values(aliases) as string[];
        const byPath = new Map<string, string | undefined>();
        const invalidPaths = new Set<string>();
        for (const batch of chunk(names, GET_PARAMETERS_LIMIT)) {
            const response = await this.client.send(
                new GetParametersCommand({
                    Names: batch,
                    WithDecryption: true,
                })
            );
            for (const parameter of response.Parameters ?? []) {
                if (parameter.Name !== undefined) byPath.set(parameter.Name, parameter.Value);
            }
            for (const name of response.InvalidParameters ?? []) invalidPaths.add(name);
        }
        if (opts?.required) {
            // No per-chunk results: the SDK output of a failed lookup adds nothing
            throwIfAny(
                this.logger,
                'SSM getParameters',
                [],
                missingParameters(aliases, invalidPaths)
            );
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
            input: redactInput(this.logger, input, PUT_PARAMETER_SAFE_FIELDS),
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
        return collectItems(paginator, page => page.Parameters);
    }
}
