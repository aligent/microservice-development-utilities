import { Logger } from '@aws-lambda-powertools/logger';
import {
    Api,
    ApiGatewayV2Client,
    GetApisCommand,
    GetRouteCommand,
    GetRoutesCommand,
    NotFoundException,
} from '@aws-sdk/client-apigatewayv2';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APIGatewayV2Service } from './api-gateway-v2';

const apiGatewayV2Mock = mockClient(ApiGatewayV2Client);

describe('APIGatewayV2Service', () => {
    afterEach(() => {
        apiGatewayV2Mock.reset();
    });

    it('constructs with default logger and client when no options supplied', () => {
        expect(() => new APIGatewayV2Service()).not.toThrow();
    });

    describe('logging', () => {
        it('logs the input once per public call', async () => {
            apiGatewayV2Mock.on(GetRoutesCommand).resolves({ Items: [] });
            const logger = new Logger();
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new APIGatewayV2Service({
                client: new ApiGatewayV2Client({}),
                logger,
            });

            await service.getRoutes({ ApiId: 'api1' });

            expect(infoSpy).toHaveBeenCalledTimes(1);
            expect(infoSpy).toHaveBeenCalledWith('Fetching API routes', {
                input: { ApiId: 'api1' },
            });
        });
    });

    describe('getRoutes', () => {
        it('follows NextToken across pages and scopes the request to the API', async () => {
            apiGatewayV2Mock
                .on(GetRoutesCommand)
                .resolvesOnce({ Items: [{ RouteKey: 'GET /orders' }], NextToken: 'page-2' })
                .resolvesOnce({ Items: [{ RouteKey: 'POST /orders' }] });
            const service = new APIGatewayV2Service({ client: new ApiGatewayV2Client({}) });

            await expect(service.getRoutes({ ApiId: 'api1' })).resolves.toEqual([
                { RouteKey: 'GET /orders' },
                { RouteKey: 'POST /orders' },
            ]);
            const calls = apiGatewayV2Mock.commandCalls(GetRoutesCommand);
            expect(calls[0]?.args[0].input).toMatchObject({ ApiId: 'api1' });
            expect(calls[1]?.args[0].input).toMatchObject({ ApiId: 'api1', NextToken: 'page-2' });
        });
    });

    describe('getRoute', () => {
        it('returns the route', async () => {
            apiGatewayV2Mock
                .on(GetRouteCommand, { ApiId: 'api1', RouteId: 'r1' })
                .resolves({ RouteId: 'r1', RouteKey: 'GET /orders' });
            const service = new APIGatewayV2Service({ client: new ApiGatewayV2Client({}) });

            await expect(service.getRoute({ ApiId: 'api1', RouteId: 'r1' })).resolves.toMatchObject(
                {
                    RouteId: 'r1',
                    RouteKey: 'GET /orders',
                }
            );
        });

        it('propagates NotFoundException for an unknown route', async () => {
            apiGatewayV2Mock
                .on(GetRouteCommand)
                .rejects(new NotFoundException({ message: 'Route not found', $metadata: {} }));
            const service = new APIGatewayV2Service({ client: new ApiGatewayV2Client({}) });

            await expect(service.getRoute({ ApiId: 'api1', RouteId: 'nope' })).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('getApis', () => {
        it('follows NextToken across pages and returns a flat array', async () => {
            const apiA: Api = {
                ApiId: 'a',
                Name: 'orders',
                ProtocolType: 'HTTP',
                RouteSelectionExpression: '$request.method $request.path',
            };
            const apiB: Api = { ...apiA, ApiId: 'b', Name: 'customers' };
            apiGatewayV2Mock
                .on(GetApisCommand)
                .resolvesOnce({ Items: [apiA], NextToken: 'page-2' })
                .resolvesOnce({ Items: [apiB] });
            const service = new APIGatewayV2Service({ client: new ApiGatewayV2Client({}) });

            await expect(service.getApis()).resolves.toEqual([apiA, apiB]);
            const calls = apiGatewayV2Mock.commandCalls(GetApisCommand);
            expect(calls[1]?.args[0].input).toMatchObject({ NextToken: 'page-2' });
        });
    });
});
