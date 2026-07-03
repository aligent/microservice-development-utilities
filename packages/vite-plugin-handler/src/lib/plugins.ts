import type { Plugin } from 'vite';

const UNNEEDED_PLUGINS = new Set([
    'vite:watch-package-data',
    'vite:modulepreload-polyfill',
    'vite:html-inline-proxy',
    'vite:css',
    'vite:css-post',
    'vite:css-analysis',
    'vite:wasm-helper',
    'vite:worker',
    'vite:worker-import-meta-url',
    'vite:asset',
    'vite:asset-import-meta-url',
    'vite:build-html',
    'vite:client-inject',
    'vite:forward-console',
    'vite:terser',
    'vite:ssr-manifest',
]);

/**
 * Removes built-in Vite plugins that handle CSS, HTML, assets, and package.json
 * watching — none of which apply to Node.js Lambda/action bundling.
 */
export const stripUnneededPlugins: Plugin = {
    name: 'strip-unneeded-plugins',
    configResolved(config) {
        const mutableConfig = config as { plugins: typeof config.plugins };
        mutableConfig.plugins = config.plugins.filter(p => !UNNEEDED_PLUGINS.has(p.name));
    },
};

export interface ConditionalShim {
    /** Substrings to search for in the rendered chunk — matches if any is found. */
    needles: string[];
    /** Import statement(s) to prepend when a needle is found. */
    statement: string;
}

const shimBanner = [
    `import { fileURLToPath as __shim_fileURLToPath } from 'node:url';`,
    `import { dirname as __shim_dirname } from 'node:path';`,
    'const __filename = __shim_fileURLToPath(import.meta.url);',
    'const __dirname = __shim_dirname(__filename);',
];

/**
 * Conditional shims injected via `renderChunk` only when the bundled output
 * references the corresponding identifiers.
 *
 * @todo Remove entries as rolldown fixes the underlying emit bugs.
 */
const CONDITIONAL_SHIMS: ConditionalShim[] = [
    {
        // Bundled CJS code may reference __dirname / __filename which don't
        // exist in ESM. Inject the shim only when actually needed.
        needles: ['__dirname', '__filename'],
        statement: shimBanner.join('\n'),
    },
    {
        // The AWS SDK smithy HTTP/2 handler references `node_http2` but
        // rolldown drops `import … from 'node:http2'`, leaving it undefined.
        needles: ['node_http2'],
        statement: `import * as node_http2 from 'node:http2';`,
    },
];

/**
 * Creates a plugin that scans each rendered chunk for known dangling
 * references and conditionally prepends the corresponding shim statements.
 *
 * @param shims - Controls which conditional shims are active.
 *   - `true` (default): use the built-in shims.
 *   - `false`: disable all shims.
 *   - `ConditionalShim[]`: replace the built-in shims with user-defined ones.
 */
export function createConditionalShims(shims?: boolean | ConditionalShim[]): Plugin {
    const activeShims = Array.isArray(shims)
        ? shims
        : shims === false
          ? []
          : CONDITIONAL_SHIMS;

    return {
        name: 'conditional-shims',
        renderChunk(code) {
            const matched = activeShims.filter(s => s.needles.some(n => code.includes(n)));
            if (matched.length === 0) return null;
            return { code: `${matched.map(s => s.statement).join('\n')}\n${code}` };
        },
    };
}
