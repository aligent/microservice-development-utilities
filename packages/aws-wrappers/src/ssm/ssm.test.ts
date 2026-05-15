import { Logger } from '@aws-lambda-powertools/logger';
import {
    DeleteParameterCommand,
    GetParameterCommand,
    GetParametersByPathCommand,
    GetParametersCommand,
    PutParameterCommand,
    SSMClient,
} from '@aws-sdk/client-ssm';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SSMService } from './ssm';

const ssmMock = mockClient(SSMClient);

describe('SSMService', () => {
    afterEach(() => {
        ssmMock.reset();
    });

    it('constructs with default logger and client when no options supplied', () => {
        expect(() => new SSMService()).not.toThrow();
    });

    describe('getParameter', () => {
        it('decrypts and returns the parameter value', async () => {
            ssmMock
                .on(GetParameterCommand, { Name: '/app/secret', WithDecryption: true })
                .resolves({ Parameter: { Value: 'shh' } });
            const service = new SSMService({ client: new SSMClient({}) });

            await expect(service.getParameter('/app/secret')).resolves.toBe('shh');
        });

        it('returns undefined when the parameter has no value', async () => {
            ssmMock.on(GetParameterCommand).resolves({});
            const service = new SSMService({ client: new SSMClient({}) });

            await expect(service.getParameter('/missing')).resolves.toBeUndefined();
        });
    });

    describe('getParameters', () => {
        it('returns a record keyed by caller-supplied aliases and decrypts by default', async () => {
            ssmMock.on(GetParametersCommand).resolves({
                Parameters: [
                    { Name: '/app/a', Value: 'aaa' },
                    { Name: '/app/b', Value: 'bbb' },
                ],
            });
            const service = new SSMService({ client: new SSMClient({}) });

            const result = await service.getParameters({
                first: '/app/a',
                second: '/app/b',
                missing: '/app/missing',
            });

            expect(result).toEqual({
                first: 'aaa',
                second: 'bbb',
                missing: undefined,
            });
            const call = ssmMock.commandCalls(GetParametersCommand)[0];
            expect(call?.args[0].input.Names).toEqual(['/app/a', '/app/b', '/app/missing']);
            expect(call?.args[0].input.WithDecryption).toBe(true);
        });

        it('handles two aliases pointing at the same path', async () => {
            ssmMock.on(GetParametersCommand).resolves({
                Parameters: [{ Name: '/app/shared', Value: 'val' }],
            });
            const service = new SSMService({ client: new SSMClient({}) });

            const result = await service.getParameters({
                alpha: '/app/shared',
                beta: '/app/shared',
            });

            expect(result).toEqual({ alpha: 'val', beta: 'val' });
        });
    });

    describe('putParameter', () => {
        it('omits Value from the INFO log', async () => {
            ssmMock.on(PutParameterCommand).resolves({});
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SSMService({ client: new SSMClient({}), logger });

            await service.putParameter({
                Name: '/app/setting',
                Value: 'shh',
                Type: 'SecureString',
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).not.toHaveProperty('Value');
        });

        it('sends a PutParameterCommand pass-through and returns the response', async () => {
            ssmMock.on(PutParameterCommand).resolves({ Version: 7 });
            const service = new SSMService({ client: new SSMClient({}) });

            const result = await service.putParameter({
                Name: '/app/setting',
                Value: 'shh',
                Type: 'SecureString',
                Overwrite: true,
            });

            expect(result.Version).toBe(7);
            const call = ssmMock.commandCalls(PutParameterCommand)[0];
            expect(call?.args[0].input).toEqual({
                Name: '/app/setting',
                Value: 'shh',
                Type: 'SecureString',
                Overwrite: true,
            });
        });
    });

    describe('deleteParameter', () => {
        it('sends a DeleteParameterCommand with the supplied name', async () => {
            ssmMock.on(DeleteParameterCommand).resolves({});
            const service = new SSMService({ client: new SSMClient({}) });

            await service.deleteParameter('/app/setting');

            const call = ssmMock.commandCalls(DeleteParameterCommand)[0];
            expect(call?.args[0].input).toEqual({ Name: '/app/setting' });
        });
    });

    describe('getParametersByPath', () => {
        it('concatenates parameters across pages', async () => {
            ssmMock
                .on(GetParametersByPathCommand)
                .resolvesOnce({
                    Parameters: [{ Name: '/app/a', Value: '1' }],
                    NextToken: 'token-1',
                })
                .resolvesOnce({
                    Parameters: [{ Name: '/app/b', Value: '2' }],
                    NextToken: 'token-2',
                })
                .resolves({
                    Parameters: [{ Name: '/app/c', Value: '3' }],
                });
            const service = new SSMService({ client: new SSMClient({}) });

            const result = await service.getParametersByPath('/app/');

            expect(result.map(p => p.Name)).toEqual(['/app/a', '/app/b', '/app/c']);
            expect(ssmMock.commandCalls(GetParametersByPathCommand)).toHaveLength(3);
        });

        it('defaults Recursive to true', async () => {
            ssmMock.on(GetParametersByPathCommand).resolves({ Parameters: [] });
            const service = new SSMService({ client: new SSMClient({}) });

            await service.getParametersByPath('/app/');

            const call = ssmMock.commandCalls(GetParametersByPathCommand)[0];
            expect(call?.args[0].input.Recursive).toBe(true);
            expect(call?.args[0].input.WithDecryption).toBe(true);
        });

        it('respects an explicit recursive: false override', async () => {
            ssmMock.on(GetParametersByPathCommand).resolves({ Parameters: [] });
            const service = new SSMService({ client: new SSMClient({}) });

            await service.getParametersByPath('/app/', { recursive: false });

            const call = ssmMock.commandCalls(GetParametersByPathCommand)[0];
            expect(call?.args[0].input.Recursive).toBe(false);
        });
    });
});
