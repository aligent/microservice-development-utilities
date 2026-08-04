# MI-251: Core plugin — `handlerBundle` with shim banner & strip-unneeded-plugins

## Parent

MI-251 / `.scratch/MI-251-vite-plugin-lambda-prd.md`

## What to build

Extract the Lambda bundling logic from `vite.config.base.mjs.template` into the `@aligent/vite-plugin-handler` package as a proper Vite plugin.

Create three internal modules and one public export:

1. **`src/lib/shim-banner.ts`** — Exports the `shimBanner` string constant (ESM shim for `__dirname`/`__filename`).

2. **`src/lib/strip-unneeded-plugins.ts`** — Internal Vite plugin using the `configResolved` hook to filter out browser-only built-in plugins: `vite:asset`, `vite:css-post`, `vite:build-html`, `vite:watch-package-data`.

3. **`src/lib/handler-bundle.ts`** — The main plugin function:
   - Signature: `handlerBundle(handlers: string, options?: HandlerBundleOptions): Plugin`
   - `HandlerBundleOptions`: `{ concurrency?: number; shims?: boolean; moduleTypes?: Record<string, string> }`
   - Uses the Vite `config` hook to inject environments, builder, and sub-plugins
   - Globs `handlers` subpath for `.ts` files, creates one environment per handler
   - Hardcodes `envPrefix` to `'handler'`
   - Skips environment creation when `VITEST=true`
   - Injects `shimBanner` by default (opt out with `shims: false`)
   - Injects `stripUnneededPlugins` automatically
   - `builder.buildApp` respects `concurrency` option
   - Throws on path traversal (`..` in handlers argument)

4. **`src/index.ts`** — Exports only `handlerBundle` (default or named) and `HandlerBundleOptions` type. Internal modules are not re-exported.

## Acceptance criteria

- [ ] `handlerBundle('src/handlers')` returns a valid Vite `Plugin` object with a `config` hook
- [ ] The `config` hook produces one environment per discovered `.ts` handler file
- [ ] Each environment has correct `build.outDir`, `build.rollupOptions`, `resolve.noExternal`, and `platform: 'node'`
- [ ] CJS `__dirname`/`__filename` shim banner is injected by default
- [ ] `shims: false` omits the banner from rollup output config
- [ ] `concurrency` option limits parallel `builder.build()` calls in `buildApp`
- [ ] `moduleTypes` option merges into `rollupOptions.moduleTypes`
- [ ] When `VITEST=true`, the config hook returns no environments
- [ ] Passing a handler path containing `..` throws an error
- [ ] `stripUnneededPlugins` is NOT exported from the package public API
- [ ] Package builds and type-checks cleanly

## Blocked by

- 01 — Package scaffold
