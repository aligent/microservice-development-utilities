# Extract Lambda bundling into @aligent/vite-plugin-handler package

## Problem Statement

The `vite.config.base.mjs.template` in the `nx-cdk` generator is overloaded — it mixes vitest test configuration with Lambda bundling logic (`defineLambdaEnvironments`, CJS shim banners, `stripUnneededPlugins`, and a custom `buildApp` builder). This makes the template hard to maintain, and consumers who want Lambda bundling outside the generator have no importable module to reach for. Every generated project gets a copy of this logic baked into its config, making updates across projects a manual find-and-replace exercise.

## Solution

Extract the Lambda bundling utilities into a new standalone package, `@aligent/vite-plugin-handler` (at `packages/vite-plugin-handler`), published as a proper Vite plugin. Consumer Vite configs become minimal — import the plugin, pass the handler path, done. Future improvements to bundling (smarter shims, new optimisations and support App Builder actions) ship as a package update rather than a generator re-run.

## User Stories

1. As a service developer, I want to add Lambda bundling to my Vite config with a single plugin call, so that my config stays concise and readable.
2. As a service developer, I want to install `@aligent/vite-plugin-handler` as a dev dependency, so that I can receive bundling improvements via a normal package update.
3. As a service developer, I want CJS `__dirname`/`__filename` shims injected by default, so that bundled dependencies referencing them don't throw at runtime.
4. As a service developer, I want to opt out of CJS shims with `shims: false`, so that I can avoid the overhead when my bundle doesn't need them.
5. As a service developer, I want to control build concurrency with a `concurrency` option, so that I can limit parallel builds in resource-constrained CI environments.
6. As a service developer, I want to pass custom `moduleTypes` overrides, so that non-standard module formats (e.g. `.graphql` files) are handled correctly by Rollup.
7. As a service developer, I want the plugin to automatically skip Lambda environments when running vitest, so that tests run without interference from the build config.
8. As a service developer, I want the plugin to strip irrelevant built-in Vite plugins (CSS, HTML, assets, package-data watcher), so that Lambda builds are lean and don't hit unexpected errors.
9. As a workspace generator consumer, I want newly generated projects to import `@aligent/vite-plugin-handler` instead of inlining bundling logic, so that generated configs are clean from day one.
10. As a workspace generator consumer, I want `@aligent/vite-plugin-handler` automatically added to my generated `devDependencies`, so that I don't have to manually install it.

## Implementation Decisions

- **New package:** `@aligent/vite-plugin-handler` at `packages/vite-plugin-handler`.
- **Proper Vite plugin:** Exported as a function returning a Vite `Plugin` object that uses the `config` hook to inject environments, builder, and sub-plugins. Not a plain object spread.
- **Public API signature:** `handlerBundle(handlers: string, options?: HandlerBundleOptions)` — handler subpath is a required positional argument.
- **Options interface:**
  - `concurrency?: number` — max concurrent environment builds (default: `Infinity`)
  - `shims?: boolean` — inject CJS `__dirname`/`__filename` shim banner (default: `true`)
  - `moduleTypes?: Record<string, string>` — extra Rollup module type overrides (default: `{}`)
- **No `envPrefix` option:** hardcoded internally to `'handler'`. Can be added later as a non-breaking change.
- **`stripUnneededPlugins`:** internal only, not exported. The main plugin injects it automatically.
- **Build format:** ESM-only via `@nx/js:tsc` with `type: "module"`. No CJS output — the sole consumer context is Vite config files, which are always ESM.
- **Vite dependency:** `peerDependency: ">=8.0.0"`.
- **Template updates:**
  - `vite.config.base.mjs.template`: remove lines 42-129 (all Lambda bundling code). Keep only vitest `baseConfig`.
  - `vite.config.mjs.template` (service-level): replace `defineLambdaEnvironments` import/spread with `handlerBundle` plugin call.
  - `base-package/package.json`: add `@aligent/vite-plugin-handler` to generated `devDependencies`.
- **Vitest config stays in the template** — test policy (coverage thresholds, reporters, setup files) is project-specific, not bundling infrastructure.

## Testing Decisions

- **Good tests** exercise the plugin's external behaviour — given inputs (handler paths, options), assert the shape of the returned plugin and what its `config` hook produces. Do not assert internal implementation details like variable names or helper function calls.
- **Plugin unit tests:** Mock `globSync` to simulate handler file discovery. Assert the `config` hook returns correct `environments` (one per handler with expected `build`, `resolve`, `rollupOptions`), a `builder.buildApp` function, and the `stripUnneededPlugins` sub-plugin. Test option variations: `shims: false` omits the banner, `concurrency` limits parallel builds, `moduleTypes` merges into rollup config. Test the vitest skip path (`VITEST=true` returns no environments).
- **Generator tests (existing):** Update the preset generator spec to assert the generated `vite.config.base.mjs` no longer contains `defineLambdaEnvironments` or `shimBanner`, and that the generated `package.json` includes `@aligent/vite-plugin-handler` in devDependencies.
- **Prior art:** Existing generator specs in `packages/nx-cdk/src/generators/preset/preset.spec.ts` use `createTreeWithEmptyWorkspace()` and assert on generated file contents — follow the same pattern.

## Out of Scope

- **Auto-detection of CJS shim need** (scanning bundle output for `__dirname`/`__filename` references) — noted as a future enhancement.
- **Migrating existing consumer projects** — this PRD covers the new package and updated generator templates; existing projects keep their inline config until manually updated.
- **Vitest configuration extraction** — vitest base config remains in the template.
- **Exporting `stripUnneededPlugins`** as a standalone utility.

## Further Notes

- Relates to existing TODO on line 42 of `vite.config.base.mjs.template`: "Extract all of the below to a package or util module to move forward" (MI-251).
- The service-level `vite.config.mjs.template` currently imports `defineLambdaEnvironments` from the base config and spreads it — this will also need updating to use the plugin.
- Full list of UnneededPlugins can can be found in `.scratch/branch-changes-summary.md`
