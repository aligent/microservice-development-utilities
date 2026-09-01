import type { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { invokeApiGatewayHandler } from './invoke';

describe('invokeApiGatewayHandler', () => {
    it('resolves an InvokedResponse for an async handler', async () => {
        const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async event => ({
            statusCode: 200,
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ receivedPath: event.path }),
        });

        const response = await invokeApiGatewayHandler(handler, { path: '/orders/1' });

        expect(response.statusCode).toBe(200);
        expect(response.headers).toEqual({ 'content-type': 'application/json' });
        expect(response.json<{ receivedPath: string }>()).toEqual({ receivedPath: '/orders/1' });
    });

    it('resolves an InvokedResponse for a callback-style handler', async () => {
        const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = (
            _event,
            _context,
            callback
        ) => {
            callback(null, { statusCode: 201, body: 'created' });
        };

        const response = await invokeApiGatewayHandler(handler);

        expect(response.statusCode).toBe(201);
        expect(response.body).toBe('created');
    });

    it('rejects when the handler calls back with an error', async () => {
        const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = (
            _event,
            _context,
            callback
        ) => {
            callback(new Error('boom'));
        };

        await expect(invokeApiGatewayHandler(handler)).rejects.toThrow('boom');
    });

    it('rejects when the handler calls back with a string error', async () => {
        const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = (
            _event,
            _context,
            callback
        ) => {
            callback('boom');
        };

        await expect(invokeApiGatewayHandler(handler)).rejects.toThrow('boom');
    });

    it('rejects when the handler calls back without a result', async () => {
        const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = (
            _event,
            _context,
            callback
        ) => {
            callback(null);
        };

        await expect(invokeApiGatewayHandler(handler)).rejects.toThrow(
            'Lambda handler completed without a result'
        );
    });

    it('rejects when an async handler throws', async () => {
        const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async () => {
            throw new Error('handler failed');
        };

        await expect(invokeApiGatewayHandler(handler)).rejects.toThrow('handler failed');
    });

    it('passes context overrides through to the handler', async () => {
        const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
            _event,
            context
        ) => ({
            statusCode: 200,
            body: context.functionName,
        });

        const response = await invokeApiGatewayHandler(handler, undefined, {
            functionName: 'my-handler',
        });

        expect(response.body).toBe('my-handler');
    });

    describe('json()', () => {
        it('throws a clear error on a non-JSON body', async () => {
            const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async () => ({
                statusCode: 200,
                body: 'not json',
            });

            const response = await invokeApiGatewayHandler(handler);

            expect(() => response.json()).toThrow('Response body is not valid JSON: not json');
        });
    });
});
