import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it } from 'vitest';
import { SecretsManagerService } from './secrets-manager';

const secretsMock = mockClient(SecretsManagerClient);

describe('SecretsManagerService', () => {
    afterEach(() => {
        secretsMock.reset();
    });

    describe('getSecret', () => {
        it('throws when the secret has no SecretString', async () => {
            secretsMock.on(GetSecretValueCommand, { SecretId: 'no-string' }).resolves({});
            const service = new SecretsManagerService({
                client: secretsMock as unknown as SecretsManagerClient,
            });

            await expect(service.getSecret('no-string')).rejects.toThrow(
                "Secret 'no-string' does not contain a string value"
            );
        });
    });

    describe('getJsonSecret', () => {
        it('parses the SecretString as JSON', async () => {
            const payload = { token: 'abc', exp: 123 };
            secretsMock
                .on(GetSecretValueCommand, { SecretId: 'json-secret' })
                .resolves({ SecretString: JSON.stringify(payload) });
            const service = new SecretsManagerService({
                client: secretsMock as unknown as SecretsManagerClient,
            });

            const result = await service.getJsonSecret<typeof payload>('json-secret');

            expect(result).toEqual(payload);
        });

        it('propagates the underlying missing-SecretString error', async () => {
            secretsMock.on(GetSecretValueCommand, { SecretId: 'missing' }).resolves({});
            const service = new SecretsManagerService({
                client: secretsMock as unknown as SecretsManagerClient,
            });

            await expect(service.getJsonSecret('missing')).rejects.toThrow(
                "Secret 'missing' does not contain a string value"
            );
        });
    });
});
