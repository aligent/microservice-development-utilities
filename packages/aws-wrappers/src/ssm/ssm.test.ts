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
import { BatchOperationError } from '../util/batch-operation-error.js';
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

        it('chunks more than 10 aliases into multiple GetParametersCommand calls and merges the results', async () => {
            const aliases = Object.fromEntries(
                Array.from({ length: 12 }, (_, i) => [`alias${i}`, `/app/param${i}`])
            ) as Record<string, string>;

            ssmMock.on(GetParametersCommand).callsFake(input => ({
                Parameters: (input.Names ?? []).map((name: string) => ({
                    Name: name,
                    Value: name === '/app/param5' ? undefined : `value-${name}`,
                })),
            }));
            const service = new SSMService({ client: new SSMClient({}) });

            const result = await service.getParameters(aliases);

            const calls = ssmMock.commandCalls(GetParametersCommand);
            expect(calls.length).toBeGreaterThan(1);

            for (let i = 0; i < 12; i++) {
                if (i === 5) {
                    expect(result[`alias${i}`]).toBeUndefined();
                } else {
                    expect(result[`alias${i}`]).toBe(`value-/app/param${i}`);
                }
            }
        });

        it('logs the full alias set once, not once per chunk', async () => {
            const aliases = Object.fromEntries(
                Array.from({ length: 12 }, (_, i) => [`alias${i}`, `/app/param${i}`])
            ) as Record<string, string>;

            ssmMock.on(GetParametersCommand).resolves({ Parameters: [] });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SSMService({ client: new SSMClient({}), logger });

            await service.getParameters(aliases);

            const fetchCalls = infoSpy.mock.calls.filter(
                ([message]) => message === 'Fetching SSM parameters'
            );
            expect(fetchCalls).toHaveLength(1);
            expect((fetchCalls[0]?.[1] as { input: { aliases: unknown } }).input.aliases).toEqual(
                aliases
            );
        });
    });

    describe('getParameters with required', () => {
        const respondWithExisting = (existing: Record<string, string>): void => {
            ssmMock.on(GetParametersCommand).callsFake(input => {
                const names: string[] = input.Names ?? [];
                return {
                    Parameters: names
                        .filter(name => name in existing)
                        .map(name => ({ Name: name, Value: existing[name] })),
                    InvalidParameters: names.filter(name => !(name in existing)),
                };
            });
        };

        const manyAliases = (count: number): Record<string, string> =>
            Object.fromEntries(
                Array.from({ length: count }, (_, i) => [`alias${i}`, `/app/param${i}`])
            );

        async function batchFailure(promise: Promise<unknown>): Promise<BatchOperationError> {
            const error = await promise.then(
                () => undefined,
                (thrown: unknown) => thrown
            );
            if (!(error instanceof BatchOperationError)) {
                throw new Error(`Expected a BatchOperationError, got: ${String(error)}`);
            }
            return error;
        }

        it('returns the same alias-keyed record as the default mode when every parameter exists', async () => {
            respondWithExisting({ '/app/a': 'aaa', '/app/b': 'bbb' });
            const service = new SSMService({ client: new SSMClient({}) });
            const aliases = { first: '/app/a', second: '/app/b' };

            const required = await service.getParameters(aliases, { required: true });
            const lenient = await service.getParameters(aliases);

            expect(required).toEqual({ first: 'aaa', second: 'bbb' });
            expect(required).toEqual(lenient);
        });

        it('throws naming the alias and path of a missing parameter', async () => {
            respondWithExisting({ '/app/a': 'aaa' });
            const service = new SSMService({ client: new SSMClient({}) });

            const error = await batchFailure(
                service.getParameters({ first: '/app/a', typo: '/app/tpyo' }, { required: true })
            );

            expect(error.failed).toEqual([
                {
                    id: '/app/tpyo',
                    code: 'ParameterNotFound',
                    message: 'Parameter not found for alias "typo"',
                },
            ]);
        });

        it('names every missing parameter merged across chunks and still sends every chunk', async () => {
            respondWithExisting({});
            const service = new SSMService({ client: new SSMClient({}) });

            const error = await batchFailure(
                service.getParameters(manyAliases(12), { required: true })
            );

            expect(ssmMock.commandCalls(GetParametersCommand)).toHaveLength(2);
            expect(error.failed.map(entry => entry.id)).toEqual(
                Array.from({ length: 12 }, (_, i) => `/app/param${i}`)
            );
        });

        it('reports only the missing parameters when some in other chunks exist', async () => {
            const missing = new Set(['/app/param2', '/app/param11']);
            respondWithExisting(
                Object.fromEntries(
                    Array.from({ length: 12 }, (_, i) => [`/app/param${i}`, `v${i}`]).filter(
                        ([path]) => !missing.has(path as string)
                    )
                )
            );
            const service = new SSMService({ client: new SSMClient({}) });

            const error = await batchFailure(
                service.getParameters(manyAliases(12), { required: true })
            );

            expect(error.failed.map(entry => entry.id)).toEqual(['/app/param2', '/app/param11']);
        });

        it('reports one entry per alias when two aliases share a missing path', async () => {
            respondWithExisting({});
            const service = new SSMService({ client: new SSMClient({}) });

            const error = await batchFailure(
                service.getParameters(
                    { alpha: '/app/shared', beta: '/app/shared' },
                    { required: true }
                )
            );

            expect(error.failed.map(entry => entry.message)).toEqual([
                'Parameter not found for alias "alpha"',
                'Parameter not found for alias "beta"',
            ]);
        });

        it('does not throw by default and maps invalid parameters to undefined', async () => {
            respondWithExisting({ '/app/a': 'aaa' });
            const service = new SSMService({ client: new SSMClient({}) });

            const result = await service.getParameters({ first: '/app/a', typo: '/app/tpyo' });

            expect(result).toEqual({ first: 'aaa', typo: undefined });
        });

        it('does not throw when required is explicitly false', async () => {
            respondWithExisting({});
            const service = new SSMService({ client: new SSMClient({}) });

            await expect(
                service.getParameters({ typo: '/app/tpyo' }, { required: false })
            ).resolves.toEqual({ typo: undefined });
        });

        it('does not wrap request-level SDK exceptions', async () => {
            ssmMock.on(GetParametersCommand).rejects(new Error('Rate exceeded'));
            const service = new SSMService({ client: new SSMClient({}) });

            const outcome = service.getParameters({ a: '/app/a' }, { required: true });

            await expect(outcome).rejects.toThrow('Rate exceeded');
            await expect(outcome).rejects.not.toBeInstanceOf(BatchOperationError);
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
