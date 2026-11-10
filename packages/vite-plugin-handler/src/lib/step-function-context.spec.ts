import { describe, expect, it, vi } from 'vitest';
import {
    extractStepFunctionLogKeys,
    getStepFunctionLogKeys,
    patchPowertoolsLogger,
    wrapHandler,
} from './step-function-context.js';

const EXECUTION_ID = 'arn:aws:states:ap-southeast-2:123456789012:execution:sm:child';
const ROOT_EXECUTION_ID = 'arn:aws:states:ap-southeast-2:123456789012:execution:sm:root';

type LambdaHandler<R> = (event: unknown, context: unknown) => Promise<R>;

function contextWith(custom: unknown) {
    return { clientContext: { custom } };
}

describe('extractStepFunctionLogKeys', () => {
    it('defaults the root execution ID to the execution ID', () => {
        expect(
            extractStepFunctionLogKeys(contextWith({ stepFunctionExecutionId: EXECUTION_ID }))
        ).toEqual({
            stepFunctionExecutionId: EXECUTION_ID,
            rootStepFunctionExecutionId: EXECUTION_ID,
        });
    });

    it('uses the root execution ID when provided', () => {
        expect(
            extractStepFunctionLogKeys(
                contextWith({
                    stepFunctionExecutionId: EXECUTION_ID,
                    rootStepFunctionExecutionId: ROOT_EXECUTION_ID,
                })
            )
        ).toEqual({
            stepFunctionExecutionId: EXECUTION_ID,
            rootStepFunctionExecutionId: ROOT_EXECUTION_ID,
        });
    });

    it.each([
        ['no context', undefined],
        ['no clientContext', {}],
        ['no custom', { clientContext: {} }],
        ['no execution ID', contextWith({})],
        ['empty execution ID', contextWith({ stepFunctionExecutionId: '' })],
        ['non-string execution ID', contextWith({ stepFunctionExecutionId: 123 })],
    ])('returns undefined with %s', (_, context) => {
        expect(extractStepFunctionLogKeys(context)).toBeUndefined();
    });
});

describe('wrapHandler', () => {
    it('exposes the keys for the duration of the invocation only', async () => {
        const handler = wrapHandler<LambdaHandler<unknown>>(async () => getStepFunctionLogKeys());

        await expect(
            handler({}, contextWith({ stepFunctionExecutionId: EXECUTION_ID }))
        ).resolves.toEqual({
            stepFunctionExecutionId: EXECUTION_ID,
            rootStepFunctionExecutionId: EXECUTION_ID,
        });
        expect(getStepFunctionLogKeys()).toBeUndefined();
    });

    it('passes event, context and return value through unchanged', async () => {
        const inner = vi.fn<LambdaHandler<string>>(async () => 'result');
        const handler = wrapHandler(inner);
        const context = contextWith({ stepFunctionExecutionId: EXECUTION_ID });

        await expect(handler({ a: 1 }, context)).resolves.toBe('result');
        expect(inner).toHaveBeenCalledWith({ a: 1 }, context);
    });

    it('keeps concurrent invocations isolated', async () => {
        const handler = wrapHandler(async (delayMs: number, _context: unknown) => {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return getStepFunctionLogKeys()?.stepFunctionExecutionId;
        });

        const results = await Promise.all([
            handler(20, contextWith({ stepFunctionExecutionId: 'first' })),
            handler(0, contextWith({ stepFunctionExecutionId: 'second' })),
            handler(10, {}),
        ]);

        expect(results).toEqual(['first', 'second', undefined]);
    });

    it('returns non-function values unchanged', () => {
        expect(wrapHandler(undefined)).toBeUndefined();
    });
});

describe('patchPowertoolsLogger', () => {
    class FakeLogger {
        calls: unknown[][] = [];
        info(...args: unknown[]) {
            this.calls.push(args);
        }
    }
    patchPowertoolsLogger(FakeLogger);

    const keys = {
        stepFunctionExecutionId: EXECUTION_ID,
        rootStepFunctionExecutionId: EXECUTION_ID,
    };

    it('adds the keys ahead of caller extra input during an invocation', async () => {
        const logger = new FakeLogger();
        const handler = wrapHandler<LambdaHandler<void>>(async () =>
            logger.info('message', { extra: true })
        );

        await handler({}, contextWith({ stepFunctionExecutionId: EXECUTION_ID }));

        expect(logger.calls).toEqual([['message', keys, { extra: true }]]);
    });

    it('leaves log calls untouched outside an invocation', () => {
        const logger = new FakeLogger();
        logger.info('message', { extra: true });

        expect(logger.calls).toEqual([['message', { extra: true }]]);
    });

    it('is idempotent', async () => {
        patchPowertoolsLogger(FakeLogger);
        const logger = new FakeLogger();
        const handler = wrapHandler<LambdaHandler<void>>(async () => logger.info('message'));

        await handler({}, contextWith({ stepFunctionExecutionId: EXECUTION_ID }));

        expect(logger.calls).toEqual([['message', keys]]);
    });
});
