# MI-251: Generator templates — consume `handlerBundle` plugin

## Parent

MI-251 / `.scratch/MI-251-vite-plugin-lambda-prd.md`

## What to build

Update the nx-cdk generator templates to use the new `@aligent/vite-plugin-handler` package instead of inlining Lambda bundling logic.

Three files need changes:

1. **`vite.config.base.mjs.template`** (preset generator) — Remove everything below the `baseConfig` export: `shimBanner`, `stripUnneededPlugins`, and `defineLambdaEnvironments`. Keep only the vitest `baseConfig` and its imports.

2. **`vite.config.mjs.template`** (service generator) — Replace the `defineLambdaEnvironments` import from `../../vite.config.base.mjs` with `import { handlerBundle } from '@aligent/vite-plugin-handler'`. Use `handlerBundle` as a plugin in `defineConfig` instead of spreading the old return value. The template should pass `'src/runtime/handlers'` as the handler path and forward `configEnv.mode` appropriately.

3. **`base-package/package.json`** (preset generator) — Add `"@aligent/vite-plugin-handler": "^0.1.0"` to the `devDependencies` object.

## Acceptance criteria

- [ ] `vite.config.base.mjs.template` no longer contains `defineLambdaEnvironments`, `shimBanner`, `stripUnneededPlugins`, or `buildApp`
- [ ] `vite.config.base.mjs.template` still exports `baseConfig` with vitest configuration
- [ ] `vite.config.mjs.template` imports `handlerBundle` from `@aligent/vite-plugin-handler`
- [ ] `vite.config.mjs.template` uses `handlerBundle` as a Vite plugin (not an object spread)
- [ ] `base-package/package.json` includes `@aligent/vite-plugin-handler` in `devDependencies`
- [ ] The preset generator still runs successfully (`presetGenerator(tree, options)` completes without error)

## Blocked by

- 02 — Core plugin
