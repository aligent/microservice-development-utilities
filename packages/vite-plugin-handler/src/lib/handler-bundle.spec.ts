import type { Logger } from 'vite';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handlerBundle } from './handler-bundle.js';

vi.mock('node:fs', () => ({
    globSync: vi.fn((pattern: string) => {
        if (pattern.includes('empty')) return [];
        // Simulate two handler files
        const base = pattern.replace('/**/*.ts', '');
        return [`${base}/create.ts`, `${base}/get.ts`];
    }),
}));

const { baseLoggerMock, createLoggerMock } = vi.hoisted(() => {
    const baseLoggerMock = {
        info: vi.fn(),
        warn: vi.fn(),
        warnOnce: vi.fn(),
        error: vi.fn(),
        clearScreen: vi.fn(),
        hasErrorLogged: vi.fn(),
        hasWarned: false,
    };
    return { baseLoggerMock, createLoggerMock: vi.fn(() => baseLoggerMock) };
});

vi.mock('vite', async importOriginal => {
    const actual = await importOriginal<typeof import('vite')>();
    return { ...actual, createLogger: createLoggerMock };
});

const HANDLERS_PATH = '/project/src/handlers';

function callConfigHook(plugin: ReturnType<typeof handlerBundle>, mode = 'production') {
    const hook = plugin.config;
    if (typeof hook !== 'function') {
        throw new Error('Expected config to be a function');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return hook.call({} as any, { mode } as any, { mode, command: 'build' } as any);
}

describe('handlerBundle', () => {
    it('returns a plugin with the correct name', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        expect(plugin.name).toBe('handler-bundle');
    });

    it('returns null when VITEST is true', () => {
        vi.stubEnv('VITEST', 'true');
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin);
        expect(result).toBeNull();
    });

    it('throws on path traversal', () => {
        const plugin = handlerBundle('/project/../etc/handlers');
        expect(() => callConfigHook(plugin)).toThrow('path traversal');
    });

    it('creates one environment per handler file', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const envNames = Object.keys(environments);
        expect(envNames).toHaveLength(2);
        expect(envNames).toContain('handler_create');
        expect(envNames).toContain('handler_get');
    });

    it('configures correct outDir for each environment', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const createEnv = environments['handler_create'] as Record<string, unknown>;
        const build = createEnv['build'] as Record<string, unknown>;
        expect(build['outDir']).toBe('dist/create');
    });

    it('configures rolldown input and output', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = environments['handler_get'] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        const rolldownOptions = build['rolldownOptions'] as Record<string, unknown>;
        const input = rolldownOptions['input'] as Record<string, string>;
        const output = rolldownOptions['output'] as Record<string, unknown>;

        const expectedPath = `${HANDLERS_PATH}/get.ts`;
        expect(input['index']).toBe(expectedPath);
        expect(output['entryFileNames']).toBe('index.mjs');
        expect(output['format']).toBe('esm');
    });

    it('externalises node built-in modules and native addons', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        const rolldownOptions = build['rolldownOptions'] as Record<string, unknown>;
        const external = rolldownOptions['external'] as Array<string | RegExp>;

        expect(external).toContain('fs');
        expect(external).toContain('node:fs');
        expect(external).toContain('path');
        expect(external).toContain('node:path');
        expect(external).toContainEqual(/\.node$/);
    });

    it('sets resolve.noExternal to true', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const resolveConfig = env['resolve'] as Record<string, unknown>;
        expect(resolveConfig['noExternal']).toBe(true);
    });

    it('disables license output', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        expect(build['license']).toBe(false);
    });

    it('disables minify in production mode', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin, 'production') as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        expect(build['minify']).toBe(false);
    });

    it('disables minify in development mode', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin, 'development') as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        expect(build['minify']).toBe(false);
    });

    it('disables sourcemap when NODE_ENV is production', () => {
        vi.stubEnv('NODE_ENV', 'production');
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin, 'production') as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        expect(build['sourcemap']).toBe(false);
    });

    it('enables sourcemap when NODE_ENV is not production', () => {
        vi.stubEnv('NODE_ENV', 'development');
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin, 'development') as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        expect(build['sourcemap']).toBe(true);
    });

    it('does not set a static banner on output options', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        const rolldownOptions = build['rolldownOptions'] as Record<string, unknown>;
        const output = rolldownOptions['output'] as Record<string, unknown>;

        expect(output['banner']).toBeUndefined();
    });

    it('appends custom external entries to built-in modules', () => {
        const plugin = handlerBundle('src/handlers', {
            external: ['@aws-sdk/client-s3', /^@smithy\//],
        });
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        const rolldownOptions = build['rolldownOptions'] as Record<string, unknown>;
        const external = rolldownOptions['external'] as Array<string | RegExp>;

        // Still includes built-ins
        expect(external).toContain('fs');
        expect(external).toContain('node:fs');
        // Includes custom entries
        expect(external).toContain('@aws-sdk/client-s3');
        expect(external).toContainEqual(/^@smithy\//);
    });

    it('does not add extra externals when external is not provided', async () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        const rolldownOptions = build['rolldownOptions'] as Record<string, unknown>;
        const external = rolldownOptions['external'] as Array<string | RegExp>;

        // Only built-in modules (bare + node: prefixed) and .node native addon pattern
        const strings = external.filter((e): e is string => typeof e === 'string');
        const regexps = external.filter((e): e is RegExp => e instanceof RegExp);
        const { builtinModules } = await import('node:module');
        const builtins = new Set([...builtinModules, ...builtinModules.map(m => `node:${m}`)]);
        expect(strings.every(e => builtins.has(e))).toBe(true);
        expect(regexps).toEqual([/\.node$/]);
    });

    it('merges moduleTypes into rolldown config', () => {
        const plugin = handlerBundle('src/handlers', {
            moduleTypes: { '.graphql': 'text' },
        });
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        const rolldownOptions = build['rolldownOptions'] as Record<string, unknown>;
        const moduleTypes = rolldownOptions['moduleTypes'] as Record<string, string>;

        expect(moduleTypes['.graphql']).toBe('text');
    });

    it('disables pluginTimings in rolldown checks', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        const rolldownOptions = build['rolldownOptions'] as Record<string, unknown>;
        const checks = rolldownOptions['checks'] as Record<string, unknown>;
        expect(checks['pluginTimings']).toBe(false);
    });

    it('has renderChunk directly on the plugin object', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        expect(plugin.renderChunk).toBeTypeOf('function');
    });

    describe('conditional-shims', () => {
        function getRenderChunk(options?: Parameters<typeof handlerBundle>[1]) {
            const plugin = handlerBundle(HANDLERS_PATH, options);
            const renderChunk = plugin.renderChunk;
            if (typeof renderChunk !== 'function') {
                throw new Error('Expected renderChunk to be a function');
            }
            return renderChunk as (code: string) => unknown;
        }

        it('prepends node_http2 import when chunk references it', () => {
            const renderChunk = getRenderChunk();
            const output = renderChunk('const x = node_http2.connect();') as {
                code: string;
                map: unknown;
            };
            expect(output.code).toContain("import * as node_http2 from 'node:http2';");
            expect(output.map).toBeDefined();
        });

        it('prepends __dirname/__filename shim when chunk references __dirname', () => {
            const renderChunk = getRenderChunk();
            const output = renderChunk('console.log(__dirname);') as { code: string };
            expect(output.code).toContain('const __dirname');
            expect(output.code).toContain('const __filename');
        });

        it('prepends __dirname/__filename shim when chunk references __filename', () => {
            const renderChunk = getRenderChunk();
            const output = renderChunk('console.log(__filename);') as { code: string };
            expect(output.code).toContain('const __filename');
        });

        it('returns null when chunk has no matching references', () => {
            const renderChunk = getRenderChunk();
            expect(renderChunk('const x = 42;')).toBeNull();
        });

        it('disables all shims when shims is false', () => {
            const renderChunk = getRenderChunk({ shims: false });
            expect(renderChunk('console.log(__dirname);')).toBeNull();
            expect(renderChunk('node_http2.connect();')).toBeNull();
        });

        it('injects user-defined conditional shim when needle matches', () => {
            const renderChunk = getRenderChunk({
                shims: [{ needles: ['myGlobal'], statement: 'const myGlobal = {};' }],
            });
            const output = renderChunk('console.log(myGlobal);') as { code: string };
            expect(output.code).toContain('const myGlobal = {};');
        });

        it('skips user-defined conditional shim when needle does not match', () => {
            const renderChunk = getRenderChunk({
                shims: [{ needles: ['myGlobal'], statement: 'const myGlobal = {};' }],
            });
            expect(renderChunk('console.log(42);')).toBeNull();
        });

        it('replaces built-in shims when ConditionalShim array is provided', () => {
            const renderChunk = getRenderChunk({
                shims: [{ needles: ['myGlobal'], statement: 'const myGlobal = {};' }],
            });
            const output = renderChunk('console.log(__dirname, myGlobal);') as { code: string };
            expect(output.code).not.toContain('const __dirname');
            expect(output.code).toContain('const myGlobal = {};');
        });
    });

    it('returns a builder with buildApp', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const builder = result['builder'] as Record<string, unknown>;
        expect(builder['buildApp']).toBeTypeOf('function');
    });

    describe('buildApp concurrency', () => {
        it('builds all handler environments', async () => {
            const plugin = handlerBundle(HANDLERS_PATH);
            const result = callConfigHook(plugin) as Record<string, unknown>;

            const buildFn = vi.fn().mockResolvedValue(undefined);
            const resultBuilder = result['builder'] as {
                buildApp: (b: unknown) => Promise<void>;
            };

            await resultBuilder.buildApp({
                environments: {
                    handler_create: { name: 'handler_create' },
                    handler_get: { name: 'handler_get' },
                    other_env: { name: 'other_env' },
                },
                build: buildFn,
            });

            // Should only build handler_ prefixed environments
            expect(buildFn).toHaveBeenCalledTimes(2);
        });

        it('limits concurrency when option is set', async () => {
            const plugin = handlerBundle('src/handlers', { concurrency: 1 });
            const result = callConfigHook(plugin) as Record<string, unknown>;

            const callOrder: number[] = [];
            let callCount = 0;
            const buildFn = vi.fn().mockImplementation(() => {
                const idx = callCount++;
                callOrder.push(idx);
                return Promise.resolve();
            });

            const resultBuilder = result['builder'] as {
                buildApp: (b: unknown) => Promise<void>;
            };

            await resultBuilder.buildApp({
                environments: {
                    handler_create: { name: 'handler_create' },
                    handler_get: { name: 'handler_get' },
                },
                build: buildFn,
            });

            expect(buildFn).toHaveBeenCalledTimes(2);
            // With concurrency 1, calls happen sequentially
            expect(callOrder).toEqual([0, 1]);
        });
    });

    describe('quiet logging', () => {
        function getCustomLogger(options?: Parameters<typeof handlerBundle>[1]) {
            const plugin = handlerBundle(HANDLERS_PATH, options);
            const result = callConfigHook(plugin) as Record<string, unknown>;
            return result['customLogger'] as Logger | undefined;
        }

        beforeEach(() => {
            baseLoggerMock.info.mockClear();
            baseLoggerMock.warn.mockClear();
            baseLoggerMock.error.mockClear();
            createLoggerMock.mockClear();
        });

        it('provides a customLogger by default', () => {
            expect(getCustomLogger()).toBeDefined();
        });

        it('does not provide a customLogger when quiet is false', () => {
            expect(getCustomLogger({ quiet: false })).toBeUndefined();
        });

        it('keeps the build-start line for handler environments', () => {
            const logger = getCustomLogger();
            logger?.info('vite v8.1.0 building handler_create environment for production...', {
                environment: 'handler_create',
            });
            expect(baseLoggerMock.info).toHaveBeenCalledTimes(1);
        });

        it('keeps the built-in-time line for handler environments', () => {
            const logger = getCustomLogger();
            logger?.info('✓ built in 123ms', { environment: 'handler_create' });
            expect(baseLoggerMock.info).toHaveBeenCalledTimes(1);
        });

        it('keeps the size/gzip summary line for handler environments', () => {
            const logger = getCustomLogger();
            logger?.info('dist/create/index.mjs  2.00 kB │ gzip: 1.00 kB', {
                environment: 'handler_create',
            });
            expect(baseLoggerMock.info).toHaveBeenCalledTimes(1);
        });

        it('drops per-module/per-chunk progress noise for handler environments', () => {
            const logger = getCustomLogger();
            logger?.info('transforming...', { environment: 'handler_create' });
            logger?.info('✓ 12 modules transformed.', { environment: 'handler_create' });
            logger?.info('rendering chunks...', { environment: 'handler_create' });
            logger?.info('computing gzip size...', { environment: 'handler_create' });
            expect(baseLoggerMock.info).not.toHaveBeenCalled();
        });

        it('passes through info messages for non-handler environments untouched', () => {
            const logger = getCustomLogger();
            logger?.info('transforming...', { environment: 'other_env' });
            expect(baseLoggerMock.info).toHaveBeenCalledTimes(1);
        });

        it('passes through info messages with no environment tag', () => {
            const logger = getCustomLogger();
            logger?.info('some top-level message');
            expect(baseLoggerMock.info).toHaveBeenCalledTimes(1);
        });

        it('delegates warn/error calls unchanged regardless of environment', () => {
            const logger = getCustomLogger();
            logger?.warn('careful', { environment: 'handler_create' });
            logger?.error('boom', { environment: 'handler_create' });
            expect(baseLoggerMock.warn).toHaveBeenCalledTimes(1);
            expect(baseLoggerMock.error).toHaveBeenCalledTimes(1);
        });
    });

    it('warns when handler directory is empty', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const plugin = handlerBundle('/project/src/empty');
        const result = callConfigHook(plugin);

        expect(result).toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No handler files found in:'));
        warnSpy.mockRestore();
    });
});
