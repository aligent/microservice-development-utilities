import { describe, expect, it } from 'vitest';
import { buildLambdaContext } from './context';

describe('buildLambdaContext', () => {
    it('produces a valid context with sensible defaults', () => {
        const context = buildLambdaContext();

        expect(context.functionName).toBe('test-function');
        expect(context.functionVersion).toBe('$LATEST');
        expect(context.getRemainingTimeInMillis()).toBe(3000);
    });

    it('applies overrides', () => {
        const context = buildLambdaContext({ functionName: 'my-handler', memoryLimitInMB: '256' });

        expect(context.functionName).toBe('my-handler');
        expect(context.memoryLimitInMB).toBe('256');
        expect(context.awsRequestId).toBe('test-aws-request-id');
    });

    it('allows overriding getRemainingTimeInMillis', () => {
        const context = buildLambdaContext({ getRemainingTimeInMillis: () => 42 });

        expect(context.getRemainingTimeInMillis()).toBe(42);
    });

    it('provides no-op legacy completion methods', () => {
        const context = buildLambdaContext();

        expect(() => context.done()).not.toThrow();
        expect(() => context.fail('boom')).not.toThrow();
        expect(() => context.succeed('ok')).not.toThrow();
    });
});
