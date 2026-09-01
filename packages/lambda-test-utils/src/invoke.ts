import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context, Handler } from 'aws-lambda';

import { buildLambdaContext } from './context.js';
import { buildApiGatewayEvent } from './event.js';

export interface InvokedResponse {
    statusCode: number;
    headers: APIGatewayProxyResult['headers'];
    body: string;
    json<T>(): T;
}

function isPromiseLike<T>(value: unknown): value is Promise<T> {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as { then?: unknown }).then === 'function'
    );
}

/**
 * Invokes an API Gateway proxy handler with a built event/context and
 * resolves whichever completion path the handler uses — a returned promise
 * or the NodeJS-style callback.
 */
export async function invokeApiGatewayHandler(
    handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult>,
    eventOverrides?: Partial<APIGatewayProxyEvent>,
    contextOverrides?: Partial<Context>
): Promise<InvokedResponse> {
    const event = buildApiGatewayEvent(eventOverrides);
    const context = buildLambdaContext(contextOverrides);

    const result = await new Promise<APIGatewayProxyResult>((resolve, reject) => {
        const returned = handler(event, context, (error, callbackResult) => {
            if (error) {
                reject(error instanceof Error ? error : new Error(String(error)));
                return;
            }
            if (callbackResult === undefined) {
                reject(new Error('Lambda handler completed without a result'));
                return;
            }
            resolve(callbackResult);
        });

        if (isPromiseLike<APIGatewayProxyResult>(returned)) {
            returned.then(resolve, reject);
        }
    });

    return {
        statusCode: result.statusCode,
        headers: result.headers,
        body: result.body,
        json<T>(): T {
            try {
                return JSON.parse(result.body) as T;
            } catch (cause) {
                throw new Error(`Response body is not valid JSON: ${result.body}`, { cause });
            }
        },
    };
}
