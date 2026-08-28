import type {
    APIGatewayEventIdentity,
    APIGatewayEventRequestContextWithAuthorizer,
    APIGatewayProxyEvent,
} from 'aws-lambda';

import { deepMerge } from './util/deep-merge.js';

const DEFAULT_IDENTITY: APIGatewayEventIdentity = {
    accessKey: null,
    accountId: null,
    apiKey: null,
    apiKeyId: null,
    caller: null,
    clientCert: null,
    cognitoAuthenticationProvider: null,
    cognitoAuthenticationType: null,
    cognitoIdentityId: null,
    cognitoIdentityPoolId: null,
    principalOrgId: null,
    sourceIp: '127.0.0.1',
    user: null,
    userAgent: 'lambda-test-utils',
    userArn: null,
};

const DEFAULT_REQUEST_CONTEXT: APIGatewayEventRequestContextWithAuthorizer<null> = {
    accountId: '123456789012',
    apiId: 'test-api-id',
    authorizer: null,
    protocol: 'HTTP/1.1',
    httpMethod: 'GET',
    identity: DEFAULT_IDENTITY,
    path: '/',
    stage: 'test',
    requestId: 'test-request-id',
    requestTimeEpoch: 0,
    resourceId: 'test-resource-id',
    resourcePath: '/',
};

/**
 * Builds a valid {@link APIGatewayProxyEvent} with sensible defaults for a
 * REST API proxy integration. `overrides` is deep-merged onto the defaults,
 * so a partial `requestContext` or `headers` override doesn't drop sibling
 * default fields.
 */
export function buildApiGatewayEvent(
    overrides?: Partial<APIGatewayProxyEvent>
): APIGatewayProxyEvent {
    const defaults: APIGatewayProxyEvent = {
        body: null,
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'GET',
        isBase64Encoded: false,
        path: '/',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: DEFAULT_REQUEST_CONTEXT,
        resource: '/',
    };

    return deepMerge(defaults, overrides);
}

/**
 * Sets a JSON-stringified `body` and the matching `content-type` header on
 * an event (or partial event overrides destined for {@link buildApiGatewayEvent}).
 */
export function withJsonBody(
    event: Partial<APIGatewayProxyEvent>,
    body: unknown
): Partial<APIGatewayProxyEvent> {
    return {
        ...event,
        body: JSON.stringify(body),
        headers: {
            ...event.headers,
            'content-type': 'application/json',
        },
    };
}
