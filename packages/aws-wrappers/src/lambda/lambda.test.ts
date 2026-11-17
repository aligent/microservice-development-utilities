import { Logger } from '@aws-lambda-powertools/logger';
import { InvokeCommand, InvokeCommandOutput, LambdaClient } from '@aws-sdk/client-lambda';
import { Uint8ArrayBlobAdapter } from '@smithy/util-stream';
import { mockClient } from 'aws-sdk-client-mock';
import xray from 'aws-xray-sdk-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LambdaFunctionError } from '../util/lambda-function-error.js';
import { LambdaService } from './lambda';

const lambdaMock = mockClient(LambdaClient);

const encode = (value: string): Uint8ArrayBlobAdapter => Uint8ArrayBlobAdapter.fromString(value);

const functionFailure = async (outcome: Promise<unknown>): Promise<LambdaFunctionError> => {
    try {
        await outcome;
    } catch (error) {
        if (error instanceof LambdaFunctionError) return error;
        throw error;
    }
    throw new Error('Expected a LambdaFunctionError but the call resolved');
};

describe('LambdaService', () => {
    afterEach(() => {
        lambdaMock.reset();
    });

    it('constructs with default logger and client when no options supplied', () => {
        expect(() => new LambdaService()).not.toThrow();
    });

    it('instruments the default client with X-Ray but leaves an injected client alone', () => {
        const captureSpy = vi.spyOn(xray, 'captureAWSv3Client');

        new LambdaService({ client: new LambdaClient({}) });
        expect(captureSpy).not.toHaveBeenCalled();

        new LambdaService();
        expect(captureSpy).toHaveBeenCalledTimes(1);

        captureSpy.mockRestore();
    });

    describe('invoke', () => {
        const service = () => new LambdaService({ client: new LambdaClient({}) });

        it('sends the input unchanged and returns the SDK output unchanged', async () => {
            const output: Partial<InvokeCommandOutput> = {
                StatusCode: 200,
                Payload: encode('{"ok":true}'),
                ExecutedVersion: '7',
            };
            lambdaMock.on(InvokeCommand).resolves(output);
            const input = { FunctionName: 'fn', Payload: encode('{"id":1}') };

            const result = await service().invoke(input);

            expect(lambdaMock.commandCalls(InvokeCommand)[0]?.args[0].input).toEqual(input);
            expect(result).toEqual(output);
        });

        it('throws a LambdaFunctionError carrying the function name, function error and parsed payload', async () => {
            lambdaMock.on(InvokeCommand).resolves({
                StatusCode: 200,
                FunctionError: 'Unhandled',
                Payload: encode(
                    JSON.stringify({ errorType: 'TypeError', errorMessage: 'boom', stackTrace: [] })
                ),
            });

            const error = await functionFailure(service().invoke({ FunctionName: 'fn' }));

            expect(error.name).toBe('LambdaFunctionError');
            expect(error.functionName).toBe('fn');
            expect(error.functionError).toBe('Unhandled');
            expect(error.errorType).toBe('TypeError');
            expect(error.errorMessage).toBe('boom');
        });

        it.each([
            ['non-JSON text', encode('not json')],
            ['a JSON value that is not an object', encode('"just a string"')],
            ['an object without the usual fields', encode('{"other":1}')],
        ])('leaves error type and message undefined for %s', async (_label, Payload) => {
            lambdaMock.on(InvokeCommand).resolves({ FunctionError: 'Handled', Payload });

            const error = await functionFailure(service().invoke({ FunctionName: 'fn' }));

            expect(error.functionError).toBe('Handled');
            expect(error.errorType).toBeUndefined();
            expect(error.errorMessage).toBeUndefined();
        });

        it('leaves error type and message undefined when the response has no payload', async () => {
            lambdaMock.on(InvokeCommand).resolves({ FunctionError: 'Handled' });

            const error = await functionFailure(service().invoke({ FunctionName: 'fn' }));

            expect(error.errorType).toBeUndefined();
            expect(error.errorMessage).toBeUndefined();
        });

        it('does not carry the raw SDK output or the stack trace on the error', async () => {
            lambdaMock.on(InvokeCommand).resolves({
                FunctionError: 'Unhandled',
                LogResult: 'c2VjcmV0LWxvZy10YWls',
                Payload: encode(
                    JSON.stringify({
                        errorType: 'Error',
                        errorMessage: 'boom',
                        stackTrace: ['at secretHandler (/var/task/index.js:1:1)'],
                    })
                ),
            });

            const error = await functionFailure(service().invoke({ FunctionName: 'fn' }));

            expect(error).not.toHaveProperty('Payload');
            expect(error).not.toHaveProperty('LogResult');
            expect(error).not.toHaveProperty('stackTrace');
            expect(JSON.stringify(error)).not.toContain('secretHandler');
            expect(JSON.stringify(error)).not.toContain('c2VjcmV0LWxvZy10YWls');
        });

        it('warns with only the function name and function error value', async () => {
            lambdaMock.on(InvokeCommand).resolves({
                FunctionError: 'Unhandled',
                Payload: encode(
                    JSON.stringify({ errorType: 'Error', errorMessage: 'pii@example.com' })
                ),
            });
            const logger = new Logger();
            const warnSpy = vi.spyOn(logger, 'warn');
            const lambda = new LambdaService({ client: new LambdaClient({}), logger });

            await functionFailure(lambda.invoke({ FunctionName: 'fn' }));

            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(warnSpy).toHaveBeenCalledWith(expect.any(String), {
                functionName: 'fn',
                functionError: 'Unhandled',
            });
        });

        it('returns an async-style response without throwing', async () => {
            lambdaMock.on(InvokeCommand).resolves({ StatusCode: 202 });

            await expect(
                service().invoke({ FunctionName: 'fn', InvocationType: 'Event' })
            ).resolves.toMatchObject({ StatusCode: 202 });
        });

        it('returns a dry-run response without throwing', async () => {
            lambdaMock.on(InvokeCommand).resolves({ StatusCode: 204 });

            await expect(
                service().invoke({ FunctionName: 'fn', InvocationType: 'DryRun' })
            ).resolves.toMatchObject({ StatusCode: 204 });
        });

        it('propagates a request-level SDK rejection unwrapped', async () => {
            const sdkError = new Error('TooManyRequestsException');
            lambdaMock.on(InvokeCommand).rejects(sdkError);

            await expect(service().invoke({ FunctionName: 'fn' })).rejects.toBe(sdkError);
        });

        it('omits the payload and client context from the INFO log but keeps the operational fields', async () => {
            lambdaMock.on(InvokeCommand).resolves({ StatusCode: 200 });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const lambda = new LambdaService({ client: new LambdaClient({}), logger });

            await lambda.invoke({
                FunctionName: 'fn',
                InvocationType: 'RequestResponse',
                Qualifier: 'live',
                LogType: 'Tail',
                TenantId: 'tenant-1',
                ClientContext: 'c2VjcmV0',
                Payload: encode(JSON.stringify({ customerEmail: 'pii@example.com' })),
            });

            expect(infoSpy).toHaveBeenCalledTimes(1);
            const [, logged] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (logged as { input: object }).input;
            expect(loggedInput).not.toHaveProperty('Payload');
            expect(loggedInput).not.toHaveProperty('ClientContext');
            expect(loggedInput).toEqual({
                FunctionName: 'fn',
                InvocationType: 'RequestResponse',
                Qualifier: 'live',
                LogType: 'Tail',
                TenantId: 'tenant-1',
            });
        });

        it('never logs the response', async () => {
            lambdaMock.on(InvokeCommand).resolves({
                StatusCode: 200,
                Payload: encode('response-secret'),
                LogResult: 'bG9nLXNlY3JldA==',
            });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const warnSpy = vi.spyOn(logger, 'warn');
            const lambda = new LambdaService({ client: new LambdaClient({}), logger });

            await lambda.invoke({ FunctionName: 'fn', LogType: 'Tail' });

            expect(warnSpy).not.toHaveBeenCalled();
            const logged = JSON.stringify(infoSpy.mock.calls);
            expect(logged).not.toContain('response-secret');
            expect(logged).not.toContain('bG9nLXNlY3JldA==');
        });
    });
});
