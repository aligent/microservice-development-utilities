import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createBuilder } from 'vite';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { handlerBundle } from './handler-bundle.js';

/**
 * Bundles a real handler that logs with Powertools, then invokes the bundle the
 * way Lambda does, to check the execution IDs reach the emitted log lines.
 */

const EXECUTION_ID = 'arn:aws:states:ap-southeast-2:123456789012:execution:sm:child';
const ROOT_EXECUTION_ID = 'arn:aws:states:ap-southeast-2:123456789012:execution:sm:root';

const FIXTURE_HANDLER = `
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'fixture' });

export const helper = 'kept';

export const handler = async (event: { label: string; delayMs?: number }) => {
    logger.info('before', { label: event.label });
    await new Promise(resolve => setTimeout(resolve, event.delayMs ?? 0));
    logger.createChild().info('after', { label: event.label });
    return 'ok';
};
`;

// Created under the repo's node_modules so the fixture can resolve Powertools
const tmpParent = join(import.meta.dirname, '../../../../node_modules/.cache/vite-plugin-handler');

type BundledModule = {
    handler: (event: unknown, context: unknown) => Promise<unknown>;
    helper: string;
};

async function bundleFixture(root: string, stepFunctionExecutionId: boolean) {
    const builder = await createBuilder({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins: [handlerBundle('handlers', { stepFunctionExecutionId })],
    });
    await builder.buildApp();
    const bundled: BundledModule = await import(
        pathToFileURL(join(root, 'dist/fixture/index.mjs')).href
    );
    return bundled;
}

async function captureLogs(run: () => Promise<unknown>) {
    const lines: Array<Record<string, unknown>> = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(chunk => {
        for (const line of String(chunk).split('\n')) {
            if (line.startsWith('{')) {
                lines.push(JSON.parse(line));
            }
        }
        return true;
    });
    try {
        await run();
    } finally {
        spy.mockRestore();
    }
    return lines;
}

function sfnContext(custom: Record<string, string>) {
    return { awsRequestId: 'request', clientContext: { custom } };
}

describe('stepFunctionExecutionId bundle', () => {
    let root: string;

    beforeAll(() => {
        mkdirSync(tmpParent, { recursive: true });
        root = mkdtempSync(join(tmpParent, 'fixture-'));
        mkdirSync(join(root, 'handlers'));
        writeFileSync(join(root, 'handlers/fixture.ts'), FIXTURE_HANDLER);
    });

    afterAll(() => {
        rmSync(root, { recursive: true, force: true });
    });

    describe('when enabled', () => {
        let bundled: BundledModule;

        beforeAll(async () => {
            bundled = await bundleFixture(root, true);
        }, 60_000);

        it('keeps the handler module’s other exports', () => {
            expect(bundled.helper).toBe('kept');
        });

        it('adds both IDs to every Powertools line, including child loggers', async () => {
            const lines = await captureLogs(() =>
                bundled.handler(
                    { label: 'a' },
                    sfnContext({
                        stepFunctionExecutionId: EXECUTION_ID,
                        rootStepFunctionExecutionId: ROOT_EXECUTION_ID,
                    })
                )
            );

            expect(lines).toHaveLength(2);
            for (const line of lines) {
                expect(line).toMatchObject({
                    label: 'a',
                    stepFunctionExecutionId: EXECUTION_ID,
                    rootStepFunctionExecutionId: ROOT_EXECUTION_ID,
                });
            }
        });

        it('keeps concurrent invocations isolated', async () => {
            const lines = await captureLogs(() =>
                Promise.all([
                    bundled.handler(
                        { label: 'slow', delayMs: 20 },
                        sfnContext({ stepFunctionExecutionId: 'slow-execution' })
                    ),
                    bundled.handler(
                        { label: 'fast' },
                        sfnContext({ stepFunctionExecutionId: 'fast-execution' })
                    ),
                    bundled.handler({ label: 'direct' }, { awsRequestId: 'request' }),
                ])
            );

            expect(lines).toHaveLength(6);
            for (const line of lines) {
                const expected =
                    line['label'] === 'direct' ? undefined : `${String(line['label'])}-execution`;
                expect(line['stepFunctionExecutionId']).toBe(expected);
                expect(line['rootStepFunctionExecutionId']).toBe(expected);
            }
        });
    });

    describe('when disabled', () => {
        it('does not add the IDs', async () => {
            const disabledRoot = mkdtempSync(join(tmpParent, 'fixture-disabled-'));
            try {
                mkdirSync(join(disabledRoot, 'handlers'));
                writeFileSync(join(disabledRoot, 'handlers/fixture.ts'), FIXTURE_HANDLER);
                const bundled = await bundleFixture(disabledRoot, false);

                const lines = await captureLogs(() =>
                    bundled.handler(
                        { label: 'a' },
                        sfnContext({ stepFunctionExecutionId: EXECUTION_ID })
                    )
                );

                expect(lines).toHaveLength(2);
                for (const line of lines) {
                    expect(line).not.toHaveProperty('stepFunctionExecutionId');
                }
            } finally {
                rmSync(disabledRoot, { recursive: true, force: true });
            }
        }, 60_000);
    });
});
