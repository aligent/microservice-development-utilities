import { describe, expect, it } from 'vitest';
import { buildApiGatewayEvent, withJsonBody } from './event';

describe('buildApiGatewayEvent', () => {
    it('produces a valid event with sensible defaults', () => {
        const event = buildApiGatewayEvent();

        expect(event).toMatchObject({
            httpMethod: 'GET',
            path: '/',
            resource: '/',
            body: null,
            isBase64Encoded: false,
            headers: {},
            pathParameters: null,
            queryStringParameters: null,
        });
        expect(event.requestContext.accountId).toBe('123456789012');
        expect(event.requestContext.identity.sourceIp).toBe('127.0.0.1');
    });

    it('applies top-level overrides', () => {
        const event = buildApiGatewayEvent({ httpMethod: 'POST', path: '/orders' });

        expect(event.httpMethod).toBe('POST');
        expect(event.path).toBe('/orders');
        expect(event.resource).toBe('/');
    });

    it('merges pathParameters onto the null default', () => {
        const event = buildApiGatewayEvent({ pathParameters: { id: '123' } });

        expect(event.pathParameters).toEqual({ id: '123' });
    });
});

describe('withJsonBody', () => {
    it('stringifies the body and sets the content-type header', () => {
        const result = withJsonBody({}, { hello: 'world' });

        expect(result.body).toBe(JSON.stringify({ hello: 'world' }));
        expect(result.headers).toEqual({ 'content-type': 'application/json' });
    });

    it('preserves existing headers on the event', () => {
        const result = withJsonBody(
            { headers: { authorization: 'Bearer test' } },
            { hello: 'world' }
        );

        expect(result.headers).toEqual({
            authorization: 'Bearer test',
            'content-type': 'application/json',
        });
    });

    it('composes with buildApiGatewayEvent', () => {
        const event = buildApiGatewayEvent(
            withJsonBody({ httpMethod: 'POST' }, { hello: 'world' })
        );

        expect(event.httpMethod).toBe('POST');
        expect(event.body).toBe(JSON.stringify({ hello: 'world' }));
        expect(event.headers['content-type']).toBe('application/json');
    });
});
