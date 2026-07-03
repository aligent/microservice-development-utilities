import { globSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { extname, resolve } from 'node:path';
import type { BuildEnvironment, EnvironmentOptions, Plugin, ViteBuilder } from 'vite';
import type { ConditionalShim } from './plugins.js';
import { createConditionalShims, stripUnneededPlugins } from './plugins.js';

export interface HandlerBundleOptions {
    /** Max concurrent environment builds (default: Infinity) */
    concurrency?: number;
    /** Controls conditional shims (default: true).
     *  Pass false to disable all shims, or a ConditionalShim array to replace the built-ins. */
    shims?: boolean | ConditionalShim[];
    /** Additional modules to exclude from the bundle, appended to Node.js built-ins (default: []) */
    external?: Array<string | RegExp>;
    /** Extra Rolldown module type overrides (default: {}) */
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    moduleTypes?: {};
}

const ENV_PREFIX = 'handler';

/**
 * Creates a Vite environment configuration for each handler file, producing
 * an ESM bundle per handler under `dist/<entryName>/index.mjs`.
 */
function buildHandlerEnvironments(
    handlersDir: string,
    mode: string | undefined,
    options: HandlerBundleOptions
): Record<string, EnvironmentOptions> {
    const external = [
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
        ...(options.external ?? []),
    ];

    const environments: Record<string, EnvironmentOptions> = {};
    const handlers = globSync(`${handlersDir}/**/*.ts`);

    for (const handler of handlers) {
        const bundledPath = handler.replace(`${handlersDir}/`, '');
        const entryName = bundledPath.replace(extname(bundledPath), '');
        const envName = `${ENV_PREFIX}_${entryName.replace(/[^a-zA-Z0-9$_]/g, '_')}`;

        environments[envName] = {
            resolve: { noExternal: true },
            build: {
                license: false,
                outDir: `dist/${entryName}`,
                minify: mode === 'development' ? 'esbuild' : false,
                sourcemap: mode !== 'production',
                rolldownOptions: {
                    input: { index: handler },
                    moduleTypes: { ...options.moduleTypes },
                    external,
                    output: {
                        entryFileNames: 'index.mjs',
                        format: 'esm',
                    },
                },
            },
        };
    }

    return environments;
}

/**
 * Builds all handler environments in batches, limiting the number of
 * concurrent builds to the given concurrency value.
 */
async function buildHandlersConcurrently(builder: ViteBuilder, concurrency: number): Promise<void> {
    const handlerEnvs = Object.entries(builder.environments)
        .filter(([name]) => name.startsWith(`${ENV_PREFIX}_`))
        .map(([, env]) => env as unknown as BuildEnvironment);

    const chunkSize = isFinite(concurrency) ? concurrency : handlerEnvs.length;
    const length = chunkSize > 0 ? Math.ceil(handlerEnvs.length / chunkSize) : 0;
    const chunks = Array.from({ length }, (_, i) =>
        handlerEnvs.slice(i * chunkSize, i * chunkSize + chunkSize)
    );
    for (const chunk of chunks) {
        await Promise.all(chunk.map(env => builder.build(env)));
    }
}

/**
 * Vite plugin that creates one build environment per handler file found under
 * the given subpath. Each handler is bundled as an ESM Node.js entry point.
 *
 * @param handlersPath - Path to the handler directory, resolved relative to `process.cwd()`.
 * @param options - Optional configuration for concurrency, shims, and module types.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import { handlerBundle } from '@aligent/vite-plugin-handler';
 *
 * export default defineConfig({
 *   plugins: [handlerBundle('src/handlers', { concurrency: 4 })],
 * });
 * ```
 */
export function handlerBundle(handlersPath: string, options: HandlerBundleOptions = {}): Plugin {
    return {
        name: 'handler-bundle',
        config(config) {
            // When running vitest, skip handler environments entirely
            if (process.env['VITEST'] === 'true') {
                return null;
            }

            if (handlersPath.includes('..')) {
                throw new Error('Invalid handler path: path traversal ("..") is not allowed');
            }

            const concurrency = options.concurrency ?? Infinity;
            const handlersDir = resolve(process.cwd(), handlersPath);
            const environments = buildHandlerEnvironments(handlersDir, config.mode, options);

            return {
                plugins: [stripUnneededPlugins, createConditionalShims(options.shims)],
                environments,
                builder: {
                    buildApp: (builder: ViteBuilder) =>
                        buildHandlersConcurrently(builder, concurrency),
                },
            };
        },
    };
}
