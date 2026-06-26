import { describe, expect, it, vi } from 'vitest';
import { handlerBundle } from './handler-bundle.js';

vi.mock('node:fs', () => ({
    globSync: vi.fn((pattern: string) => {
        if (pattern.includes('empty')) return [];
        // Simulate two handler files
        const base = pattern.replace('/**/*.ts', '');
        return [`${base}/create.ts`, `${base}/get.ts`];
    }),
}));

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

    it('externalises node built-in modules', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        const rolldownOptions = build['rolldownOptions'] as Record<string, unknown>;
        const external = rolldownOptions['external'] as string[];

        expect(external).toContain('fs');
        expect(external).toContain('node:fs');
        expect(external).toContain('path');
        expect(external).toContain('node:path');
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

    it('enables esbuild minify in development mode', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin, 'development') as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        expect(build['minify']).toBe('esbuild');
    });

    it('disables sourcemap in production mode', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin, 'production') as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        expect(build['sourcemap']).toBe(false);
    });

    it('enables sourcemap in development mode', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin, 'development') as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        expect(build['sourcemap']).toBe(true);
    });

    it('includes shim banner by default', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        const rolldownOptions = build['rolldownOptions'] as Record<string, unknown>;
        const output = rolldownOptions['output'] as Record<string, unknown>;

        expect(output['banner']).toContain('__dirname');
        expect(output['banner']).toContain('__filename');
    });

    it('omits shim banner when shims is false', () => {
        const plugin = handlerBundle('src/handlers', { shims: false });
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, Record<string, unknown>>;
        const env = Object.values(environments)[0] as Record<string, unknown>;
        const build = env['build'] as Record<string, unknown>;
        const rolldownOptions = build['rolldownOptions'] as Record<string, unknown>;
        const output = rolldownOptions['output'] as Record<string, unknown>;

        expect(output['banner']).toBeUndefined();
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

    it('includes strip-unneeded-plugins in returned config', () => {
        const plugin = handlerBundle(HANDLERS_PATH);
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const plugins = result['plugins'] as Array<{ name: string }>;
        expect(plugins.some(p => p.name === 'strip-unneeded-plugins')).toBe(true);
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

    it('returns no environments when handler directory is empty', () => {
        const plugin = handlerBundle('/project/src/empty');
        const result = callConfigHook(plugin) as Record<string, unknown>;

        const environments = result['environments'] as Record<string, unknown>;
        expect(Object.keys(environments)).toHaveLength(0);
    });
});
