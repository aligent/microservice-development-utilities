import { Logger } from '@aws-lambda-powertools/logger';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { captureAWSv3Client } from 'aws-xray-sdk-core';

/**
 * Wrapper around the AWS Secrets Manager client providing structured
 * Powertools logging and X-Ray tracing by default.
 */
export class SecretsManagerService {
    private readonly client: SecretsManagerClient;
    private readonly logger: Logger;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to a logger with
     * `serviceName: 'SecretsManagerService'`.
     * @param opts.client - Optional pre-configured `SecretsManagerClient`. When
     * supplied, the wrapper does not apply X-Ray instrumentation — the caller
     * owns that decision.
     */
    constructor(opts?: { logger?: Logger; client?: SecretsManagerClient }) {
        this.client = opts?.client ?? captureAWSv3Client(new SecretsManagerClient());
        this.logger = opts?.logger ?? new Logger({ serviceName: 'SecretsManagerService' });
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
        const response = await this.client.send(new GetSecretValueCommand({ SecretId: secretId }));

        if (response.SecretString === undefined) {
            throw new Error(`Secret '${secretId}' does not contain a string value`);
        }

        return response.SecretString;
    }

    /**
     * Fetch a secret and parse it as JSON.
     * @param secretId - The ARN or friendly name of the secret.
     * @template T - Expected shape of the parsed secret.
     * @returns The parsed secret value.
     * @throws If the secret has no `SecretString` or the value is not valid JSON.
     */
    async getJsonSecret<T>(secretId: string): Promise<T> {
        const secret = await this.getSecret(secretId);
        return JSON.parse(secret) as T;
    }
}
