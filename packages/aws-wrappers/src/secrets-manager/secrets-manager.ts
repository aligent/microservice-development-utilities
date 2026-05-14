import { Logger } from '@aws-lambda-powertools/logger';
import {
    CreateSecretCommand,
    CreateSecretCommandInput,
    CreateSecretCommandOutput,
    DeleteSecretCommand,
    DeleteSecretCommandInput,
    DeleteSecretCommandOutput,
    GetSecretValueCommand,
    PutSecretValueCommand,
    PutSecretValueCommandInput,
    PutSecretValueCommandOutput,
    SecretsManagerClient,
    UpdateSecretCommand,
    UpdateSecretCommandInput,
    UpdateSecretCommandOutput,
} from '@aws-sdk/client-secrets-manager';
import { captureAWSv3Client } from 'aws-xray-sdk-core';

/**
 * Wrapper around the AWS Secrets Manager client providing structured
 * Powertools logging and X-Ray tracing by default.
 *
 * Write operations (`createSecret`, `updateSecret`, `putSecretValue`,
 * `deleteSecret`) are exposed for convenience but should be used with care:
 * secret lifecycle is usually managed by IaC (CDK / Terraform). Prefer IaC
 * for anything that exists at deploy time; reserve runtime writes for
 * dynamically-issued credentials, rotation flows, or other genuinely
 * mutable values.
 */
export class SecretsManagerService {
    private readonly client: SecretsManagerClient;
    private readonly logger: Logger;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `SecretsManagerClient`. When
     * supplied, the wrapper does not apply X-Ray instrumentation — the caller
     * owns that decision.
     */
    constructor(opts?: { logger?: Logger; client?: SecretsManagerClient }) {
        this.client = opts?.client ?? captureAWSv3Client(new SecretsManagerClient());
        this.logger = opts?.logger ?? new Logger();
    }

    /**
     * Fetch a secret's string value from Secrets Manager.
     * @param secretId - The ARN or friendly name of the secret.
     * @returns The secret's `SecretString` value.
     * @throws If the response does not contain a `SecretString` (e.g. the secret
     * stores binary data).
     */
    async getSecret(secretId: string): Promise<string> {
        this.logger.info('Fetching secret', { input: { secretId } });
        return this.fetchSecretString(secretId);
    }

    /**
     * Fetch a secret and parse it as JSON.
     * @param secretId - The ARN or friendly name of the secret.
     * @template T - Expected shape of the parsed secret.
     * @returns The parsed secret value.
     * @throws If the secret has no `SecretString` or the value is not valid JSON.
     */
    async getJsonSecret<T>(secretId: string): Promise<T> {
        this.logger.info('Fetching JSON secret', { input: { secretId } });
        const secretString = await this.fetchSecretString(secretId);
        return JSON.parse(secretString) as T;
    }

    /**
     * Create a new secret. The log line omits `SecretString` / `SecretBinary`
     * to avoid leaking secret material.
     *
     * Prefer IaC (CDK / Terraform) for secret lifecycle — use this for
     * dynamically-issued credentials only.
     */
    async createSecret(input: CreateSecretCommandInput): Promise<CreateSecretCommandOutput> {
        this.logger.info('Creating secret', {
            input: {
                Name: input.Name,
                Description: input.Description,
                KmsKeyId: input.KmsKeyId,
                Tags: input.Tags,
            },
        });
        return this.client.send(new CreateSecretCommand(input));
    }

    /**
     * Update an existing secret's metadata or value. The log line omits
     * `SecretString` / `SecretBinary` to avoid leaking secret material.
     *
     * Prefer IaC (CDK / Terraform) for secret lifecycle — use this for
     * runtime metadata updates only.
     */
    async updateSecret(input: UpdateSecretCommandInput): Promise<UpdateSecretCommandOutput> {
        this.logger.info('Updating secret', {
            input: {
                SecretId: input.SecretId,
                Description: input.Description,
                KmsKeyId: input.KmsKeyId,
            },
        });
        return this.client.send(new UpdateSecretCommand(input));
    }

    /**
     * Store a new version of a secret's value. The log line omits
     * `SecretString` / `SecretBinary` to avoid leaking secret material.
     *
     * Typically used by rotation flows.
     */
    async putSecretValue(input: PutSecretValueCommandInput): Promise<PutSecretValueCommandOutput> {
        this.logger.info('Putting secret value', {
            input: {
                SecretId: input.SecretId,
                VersionStages: input.VersionStages,
            },
        });
        return this.client.send(new PutSecretValueCommand(input));
    }

    /**
     * Delete a secret. Pass `ForceDeleteWithoutRecovery: true` to bypass the
     * default 7-30 day recovery window (irreversible).
     *
     * The log line follows the package allowlist convention — `SecretId`,
     * `RecoveryWindowInDays`, `ForceDeleteWithoutRecovery` only. The input
     * carries no secret material today, but the explicit allowlist keeps the
     * log shape consistent with the other write methods.
     *
     * Prefer IaC (CDK / Terraform) for secret lifecycle.
     */
    async deleteSecret(input: DeleteSecretCommandInput): Promise<DeleteSecretCommandOutput> {
        this.logger.info('Deleting secret', {
            input: {
                SecretId: input.SecretId,
                RecoveryWindowInDays: input.RecoveryWindowInDays,
                ForceDeleteWithoutRecovery: input.ForceDeleteWithoutRecovery,
            },
        });
        return this.client.send(new DeleteSecretCommand(input));
    }

    private async fetchSecretString(secretId: string): Promise<string> {
        const response = await this.client.send(new GetSecretValueCommand({ SecretId: secretId }));

        if (response.SecretString === undefined) {
            throw new Error(`Secret '${secretId}' does not contain a string value`);
        }

        return response.SecretString;
    }
}
