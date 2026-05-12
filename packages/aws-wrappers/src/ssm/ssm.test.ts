import {
    GetParameterCommand,
    GetParametersByPathCommand,
    GetParametersCommand,
    SSMClient,
} from '@aws-sdk/client-ssm';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it } from 'vitest';
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
        it('returns a record keyed by parameter name', async () => {
            ssmMock.on(GetParametersCommand).resolves({
                Parameters: [
                    { Name: '/app/a', Value: 'aaa' },
                    { Name: '/app/b', Value: 'bbb' },
                ],
            });
            const service = new SSMService({ client: new SSMClient({}) });

            const result = await service.getParameters(['/app/a', '/app/b', '/app/missing']);

            expect(result).toEqual({
                '/app/a': 'aaa',
                '/app/b': 'bbb',
                '/app/missing': undefined,
            });
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
