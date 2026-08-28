import type { Context } from 'aws-lambda';

import { deepMerge } from './util/deep-merge.js';

/**
 * Builds a valid Lambda {@link Context} with sensible defaults. `overrides`
 * is deep-merged onto the defaults.
 */
export function buildLambdaContext(overrides?: Partial<Context>): Context {
    const defaults: Context = {
        callbackWaitsForEmptyEventLoop: true,
        functionName: 'test-function',
        functionVersion: '$LATEST',
        invokedFunctionArn: 'arn:aws:lambda:ap-southeast-2:123456789012:function:test-function',
        memoryLimitInMB: '128',
        awsRequestId: 'test-aws-request-id',
        logGroupName: '/aws/lambda/test-function',
        logStreamName: 'test-log-stream',
        getRemainingTimeInMillis: () => 3000,
        done: () => undefined,
        fail: () => undefined,
        succeed: () => undefined,
    };

    return deepMerge(defaults, overrides);
}
