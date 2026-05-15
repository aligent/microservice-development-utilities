import { Logger } from '@aws-lambda-powertools/logger';
import {
    CreateSecretCommand,
    DeleteSecretCommand,
    GetSecretValueCommand,
    PutSecretValueCommand,
    SecretsManagerClient,
    UpdateSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

    describe('createSecret', () => {
        it('sends a CreateSecretCommand pass-through and returns the ARN', async () => {
            secretsMock
                .on(CreateSecretCommand)
                .resolves({ ARN: 'arn:aws:secretsmanager:::secret/new' });
            const service = new SecretsManagerService({ client: new SecretsManagerClient({}) });

            const result = await service.createSecret({
                Name: 'new-secret',
                SecretString: 'shh',
                Description: 'a new secret',
            });

            expect(result.ARN).toBe('arn:aws:secretsmanager:::secret/new');
            const call = secretsMock.commandCalls(CreateSecretCommand)[0];
            expect(call?.args[0].input).toEqual({
                Name: 'new-secret',
                SecretString: 'shh',
                Description: 'a new secret',
            });
        });
    });

    describe('updateSecret', () => {
        it('sends an UpdateSecretCommand pass-through', async () => {
            secretsMock.on(UpdateSecretCommand).resolves({ VersionId: 'v2' });
            const service = new SecretsManagerService({ client: new SecretsManagerClient({}) });

            const result = await service.updateSecret({
                SecretId: 'arn:secret',
                Description: 'updated',
            });

            expect(result.VersionId).toBe('v2');
            expect(secretsMock.commandCalls(UpdateSecretCommand)).toHaveLength(1);
        });
    });

    describe('putSecretValue', () => {
        it('sends a PutSecretValueCommand pass-through', async () => {
            secretsMock.on(PutSecretValueCommand).resolves({ VersionId: 'v3' });
            const service = new SecretsManagerService({ client: new SecretsManagerClient({}) });

            const result = await service.putSecretValue({
                SecretId: 'arn:secret',
                SecretString: 'new-shh',
            });

            expect(result.VersionId).toBe('v3');
            expect(secretsMock.commandCalls(PutSecretValueCommand)).toHaveLength(1);
        });
    });

    describe('deleteSecret', () => {
        it('sends a DeleteSecretCommand pass-through', async () => {
            secretsMock.on(DeleteSecretCommand).resolves({ DeletionDate: new Date(0) });
            const service = new SecretsManagerService({ client: new SecretsManagerClient({}) });

            const result = await service.deleteSecret({
                SecretId: 'arn:secret',
                RecoveryWindowInDays: 7,
            });

            expect(result.DeletionDate).toEqual(new Date(0));
            const call = secretsMock.commandCalls(DeleteSecretCommand)[0];
            expect(call?.args[0].input).toEqual({
                SecretId: 'arn:secret',
                RecoveryWindowInDays: 7,
            });
        });
    });

    describe('write-method log shape', () => {
        const buildLoggedService = () => {
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SecretsManagerService({
                client: new SecretsManagerClient({}),
                logger,
            });
            return { service, infoSpy };
        };

        const loggedInputFrom = (spy: ReturnType<typeof vi.spyOn>) => {
            const [, payload] = spy.mock.calls[0] ?? [];
            return (payload as { input: object }).input;
        };

        it('createSecret omits SecretString from the INFO log', async () => {
            secretsMock.on(CreateSecretCommand).resolves({});
            const { service, infoSpy } = buildLoggedService();

            await service.createSecret({ Name: 'n', SecretString: 'shh' });

            expect(loggedInputFrom(infoSpy)).not.toHaveProperty('SecretString');
        });

        it('updateSecret omits SecretString from the INFO log', async () => {
            secretsMock.on(UpdateSecretCommand).resolves({});
            const { service, infoSpy } = buildLoggedService();

            await service.updateSecret({ SecretId: 'id', SecretString: 'shh' });

            expect(loggedInputFrom(infoSpy)).not.toHaveProperty('SecretString');
        });

        it('putSecretValue omits SecretString from the INFO log', async () => {
            secretsMock.on(PutSecretValueCommand).resolves({});
            const { service, infoSpy } = buildLoggedService();

            await service.putSecretValue({ SecretId: 'id', SecretString: 'shh' });

            expect(loggedInputFrom(infoSpy)).not.toHaveProperty('SecretString');
        });

        it('deleteSecret logs only the safe fields at INFO', async () => {
            secretsMock.on(DeleteSecretCommand).resolves({});
            const { service, infoSpy } = buildLoggedService();

            await service.deleteSecret({
                SecretId: 'id',
                RecoveryWindowInDays: 7,
                ForceDeleteWithoutRecovery: false,
            });

            const logged = loggedInputFrom(infoSpy);
            expect(Object.keys(logged)).toEqual(
                expect.arrayContaining([
                    'SecretId',
                    'RecoveryWindowInDays',
                    'ForceDeleteWithoutRecovery',
                ])
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
