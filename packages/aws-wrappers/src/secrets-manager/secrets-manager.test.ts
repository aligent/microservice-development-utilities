import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it } from 'vitest';
import { SecretsManagerService } from './secrets-manager';

const secretsMock = mockClient(SecretsManagerClient);

describe('SecretsManagerService', () => {
    afterEach(() => {
        secretsMock.reset();
    });

    it('constructs with default logger and client when no options supplied', () => {
        expect(() => new SecretsManagerService()).not.toThrow();
    });

    describe('getSecret', () => {
        it('returns the SecretString value', async () => {
            secretsMock
                .on(GetSecretValueCommand, { SecretId: 'plain' })
                .resolves({ SecretString: 'hello' });
            const service = new SecretsManagerService({ client: new SecretsManagerClient({}) });

            await expect(service.getSecret('plain')).resolves.toBe('hello');
        });

        it('throws when the secret has no SecretString', async () => {
            secretsMock.on(GetSecretValueCommand, { SecretId: 'no-string' }).resolves({});
            const service = new SecretsManagerService({ client: new SecretsManagerClient({}) });

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
            const service = new SecretsManagerService({ client: new SecretsManagerClient({}) });

            const result = await service.getJsonSecret<typeof payload>('json-secret');

            expect(result).toEqual(payload);
        });

        it('propagates the underlying missing-SecretString error', async () => {
            secretsMock.on(GetSecretValueCommand, { SecretId: 'missing' }).resolves({});
            const service = new SecretsManagerService({ client: new SecretsManagerClient({}) });

            await expect(service.getJsonSecret('missing')).rejects.toThrow(
                "Secret 'missing' does not contain a string value"
            );
        });
    });
});
