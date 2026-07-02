# @aligent/vite-plugin-handler

Vite plugin that bundles Lambda handlers as individual ESM entry points using the [Vite Environment API](https://vite.dev/guide/api-environment).

Each `.ts` file discovered under the given handler path gets its own build environment, producing a standalone `dist/<entryName>/index.mjs` output.

## Installation

```sh
npm install --save-dev @aligent/vite-plugin-handler
```

Requires `vite >= 8.0.14` as a peer dependency.

## Usage

```js
// vite.config.mjs
import { defineConfig } from 'vite';
import { handlerBundle } from '@aligent/vite-plugin-handler';

export default defineConfig({
    plugins: [handlerBundle('src/runtime/handlers')],
});
```

## Options

`handlerBundle(handlersPath, options?)` accepts an optional second argument:

| Option | Type | Default | Description |
|---|---|---|---|
| `concurrency` | `number` | `Infinity` | Max concurrent environment builds. Useful for resource-constrained CI. |
| `shims` | `boolean \| string` | `true` | Inject CJS `__dirname`/`__filename` shim banner into each bundle. Pass a string to use a custom banner instead. |
| `external` | `(string \| RegExp)[]` | `[]` | Additional modules to exclude from the bundle, appended to Node.js built-ins. |
| `moduleTypes` | `Record<string, string>` | `{}` | Extra Rolldown module type overrides (e.g. `{ '.graphql': 'text' }`). |

```js
handlerBundle('src/runtime/handlers', {
    concurrency: 2,
    shims: false,
    external: ['@aws-sdk/client-s3', /^@smithy\//],
    moduleTypes: { '.graphql': 'text' },
});
```

### Custom shims

Pass a string to `shims` to replace the built-in banner with your own:

```js
handlerBundle('src/runtime/handlers', {
    shims: 'const MY_VAR = "value";',
});
```

To compose with the built-in shim, import `shimBanner` and concatenate:

```js
import { handlerBundle, shimBanner } from '@aligent/vite-plugin-handler';

handlerBundle('src/runtime/handlers', {
    shims: `${shimBanner}\nconst MY_VAR = "value";`,
});
```

## Behaviour

- Automatically skips handler environment creation when running under **vitest** (`VITEST=true`), so tests run without interference.
- Strips built-in Vite plugins that don't apply to Node.js bundling:

  | Plugin | Why removed |
  |---|---|
  | `vite:watch-package-data` | Watches `package.json` for HMR — no HMR in builds |
  | `vite:modulepreload-polyfill` | Browser `<link rel=modulepreload>` — no browser |
  | `vite:html-inline-proxy` | Inline scripts in HTML — no HTML |
  | `vite:css` | CSS parsing/transforms — no CSS |
  | `vite:css-post` | CSS post-processing — no CSS |
  | `vite:css-analysis` | CSS dependency analysis — no CSS |
  | `vite:wasm-helper` | WASM loading for browsers |
  | `vite:worker` | Web Workers — no browser |
  | `vite:worker-import-meta-url` | Web Worker URL resolution — no browser |
  | `vite:asset` | Static asset handling (images, fonts) — no static assets |
  | `vite:asset-import-meta-url` | `new URL('asset', import.meta.url)` for assets |
  | `vite:build-html` | HTML entry processing — no HTML |
  | `vite:client-inject` | HMR client injection — no HMR |
  | `vite:forward-console` | Forwards console to Vite overlay — dev server only |
  | `vite:terser` | Terser minifier — uses esbuild/oxc instead |
  | `vite:ssr-manifest` | SSR manifest generation — not doing SSR |
- Externalises all Node.js built-in modules.
- Outputs ESM format with `index.mjs` entry file names.

## Development

```sh
# Build
npx nx build vite-plugin-handler

# Test
npx nx test vite-plugin-handler
```
