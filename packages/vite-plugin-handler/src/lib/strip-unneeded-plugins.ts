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
