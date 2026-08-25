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
| `shims` | `boolean \| ConditionalShim[]` | `true` | Controls conditional shims. `true` uses the built-in shims, `false` disables all shims, or pass a `ConditionalShim[]` to replace the built-ins with your own. |
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

Pass a `ConditionalShim[]` to replace the built-in shims with your own. Each shim is only injected when its needles are found in the rendered chunk:

```js
import { handlerBundle } from '@aligent/vite-plugin-handler';
import type { ConditionalShim } from '@aligent/vite-plugin-handler';

handlerBundle('src/runtime/handlers', {
    shims: [
        {
            needles: ['myGlobal'],
            statement: 'const myGlobal = {};',
        },
    ],
});
```

## Behaviour

- Automatically skips handler environment creation when running under **vitest** (`VITEST=true`), so tests run without interference.
- Sets `checks: { pluginTimings: false }` to silence misleading `[PLUGIN_TIMINGS]` warnings. This does **not** remove any plugins — it only suppresses the timing diagnostic. Vite 8's per-environment plugin resolution re-adds built-in plugins after config resolution, so plugins that do no meaningful work for Lambda bundles still appear in timing reports. See [Rolldown docs](https://rolldown.rs/options/checks#plugintimings) for details.
- Conditionally injects shims via `renderChunk` only when the bundled output actually references the corresponding identifiers:

  | Shim | Trigger | Purpose |
  |---|---|---|
  | `__dirname` / `__filename` | `__dirname` or `__filename` in chunk | ESM equivalents for bundled CJS dependencies |
  | `node:http2` | `node_http2` in chunk | Works around a rolldown bug that drops externalised builtin imports |

- **Minification is always disabled.** Lambda handler bundles prioritise debuggability (readable stack traces, easier CloudWatch inspection) over bundle size.
- **Sourcemaps** are controlled by `NODE_ENV` rather than Vite's `--mode` flag — they are enabled unless `NODE_ENV=production`. This uses the deploy-time environment as the signal because Lambda builds always invoke `vite build` regardless of target stage.
- Shim injection in `renderChunk` uses [MagicString](https://github.com/rich-harris/magic-string) to produce proper sourcemaps, so prepended shim code does not shift source positions in downstream tooling.
- Externalises all Node.js built-in modules.
- Externalises `.node` native addon files. Compiled C/C++ addons cannot be bundled into JavaScript, so they are automatically excluded. Common packages with native addons include `cpu-features` (used by `ssh2`), `sharp`, `bcrypt`, `better-sqlite3`, and `@parcel/watcher`.
- Outputs ESM format with `index.mjs` entry file names.

## Development

```sh
# Build
npx nx build vite-plugin-handler

# Test
npx nx test vite-plugin-handler
```
