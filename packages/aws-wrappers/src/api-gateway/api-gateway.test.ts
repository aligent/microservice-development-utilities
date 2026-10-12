import { Logger } from '@aws-lambda-powertools/logger';
import {
    APIGatewayClient,
    GetApiKeyCommand,
    GetApiKeysCommand,
    GetResourcesCommand,
    GetRestApisCommand,
    NotFoundException,
} from '@aws-sdk/client-api-gateway';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APIGatewayService } from './api-gateway';

const apiGatewayMock = mockClient(APIGatewayClient);

describe('APIGatewayService', () => {
    afterEach(() => {
        apiGatewayMock.reset();
    });

    it('constructs with default logger and client when no options supplied', () => {
        expect(() => new APIGatewayService()).not.toThrow();
    });

    describe('logging', () => {
        it('logs the input once and never logs API key values', async () => {
            apiGatewayMock
                .on(GetApiKeysCommand)
                .resolves({ items: [{ id: 'k1', value: 'secret-1' }] });
            const logger = new Logger();
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new APIGatewayService({ client: new APIGatewayClient({}), logger });

            await service.getApiKeys({ nameQuery: 'partner' });

            expect(infoSpy).toHaveBeenCalledTimes(1);
            expect(infoSpy).toHaveBeenCalledWith('Fetching API keys', {
                input: { nameQuery: 'partner' },
            });
            expect(JSON.stringify(infoSpy.mock.calls)).not.toContain('secret-1');
        });
    });

    describe('getRestApis', () => {
        it('walks every page and returns a flat array', async () => {
            apiGatewayMock
                .on(GetRestApisCommand)
                .resolvesOnce({ items: [{ id: 'a' }], position: 'next' })
                .resolvesOnce({ items: [{ id: 'b' }] });
            const service = new APIGatewayService({ client: new APIGatewayClient({}) });

            await expect(service.getRestApis()).resolves.toEqual([{ id: 'a' }, { id: 'b' }]);
        });
    });

    describe('getApiKeys', () => {
        it('walks every page, always requests key values and passes filters through', async () => {
            apiGatewayMock
                .on(GetApiKeysCommand)
                .resolvesOnce({ items: [{ id: 'k1', value: 'secret-1' }], position: 'next' })
                .resolvesOnce({ items: [{ id: 'k2', value: 'secret-2' }] });
            const service = new APIGatewayService({ client: new APIGatewayClient({}) });

            const keys = await service.getApiKeys({ nameQuery: 'partner' });

            expect(keys).toEqual([
                { id: 'k1', value: 'secret-1' },
                { id: 'k2', value: 'secret-2' },
            ]);
            expect(apiGatewayMock.commandCalls(GetApiKeysCommand)[0]?.args[0].input).toMatchObject({
                nameQuery: 'partner',
                includeValues: true,
            });
        });
    });

    describe('getApiKey', () => {
        it('always requests the key value and returns the key', async () => {
            apiGatewayMock
                .on(GetApiKeyCommand, { apiKey: 'k1', includeValue: true })
                .resolves({ id: 'k1', value: 'secret-1' });
            const service = new APIGatewayService({ client: new APIGatewayClient({}) });

            await expect(service.getApiKey({ apiKey: 'k1' })).resolves.toMatchObject({
                id: 'k1',
                value: 'secret-1',
            });
        });

        it('propagates NotFoundException for an unknown key', async () => {
            apiGatewayMock
                .on(GetApiKeyCommand)
                .rejects(
                    new NotFoundException({ message: 'Invalid API Key identifier', $metadata: {} })
                );
            const service = new APIGatewayService({ client: new APIGatewayClient({}) });

            await expect(service.getApiKey({ apiKey: 'missing' })).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('getResources', () => {
        it('walks every page, returns a flat array and passes the input through', async () => {
            apiGatewayMock
                .on(GetResourcesCommand)
                .resolvesOnce({ items: [{ id: 'r1', path: '/' }], position: 'next' })
                .resolvesOnce({ items: [{ id: 'r2', path: '/orders' }] });
            const service = new APIGatewayService({ client: new APIGatewayClient({}) });

            const resources = await service.getResources({ restApiId: 'api1', embed: ['methods'] });

            expect(resources).toEqual([
                { id: 'r1', path: '/' },
                { id: 'r2', path: '/orders' },
            ]);
            expect(
                apiGatewayMock.commandCalls(GetResourcesCommand)[0]?.args[0].input
            ).toMatchObject({
                restApiId: 'api1',
                embed: ['methods'],
            });
        });
    });
});
