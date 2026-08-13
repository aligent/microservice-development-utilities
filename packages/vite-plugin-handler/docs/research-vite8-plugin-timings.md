# Research: Vite 8 PLUGIN_TIMINGS Warning for Built-in Plugins

**Date:** 2026-08-07
**Context:** `strip-unneeded-plugins.ts` removes built-in Vite plugins in `configResolved`, but warnings persist for `vite:terser`, `vite:worker`, `vite:build-import-analysis`, `vite:resolve-builtin:get-environment`, `vite:css`, and `vite:prepare-out-dir`.

---

## 1. Where the Warning Originates

The `[PLUGIN_TIMINGS]` warning is a **Rolldown-native feature**, not a Vite JS-side warning. It is controlled by the `checks.pluginTimings` option in Rolldown's input options.

- **Default:** `true` (enabled)
- **Threshold:** Only triggers when Rolldown's internal build time exceeds **3 seconds** ([rolldown/rolldown#7559](https://github.com/rolldown/rolldown/issues/7559))
- **Plugin threshold:** Only hooks consuming **>= 1 second** get a line item
- **Detection logic:** Warning activates when "plugin time exceeds 100x the link stage time"
- **Limitation:** Built-in **Rust** plugins and parallel worker thread plugins don't appear in reports; only JS-side plugin hooks are measured

Source: [Rolldown docs - checks.pluginTimings](https://rolldown.rs/options/checks#plugintimings)

---

## 2. Why Stripping in `configResolved` Doesn't Remove These Plugins

### The Core Issue: Build Plugins Are Added After `resolvePlugins`

Vite assembles its plugin array in [`resolvePlugins()`](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/index.ts) which runs during `resolveConfig()`. The full assembly order is:

1. Core plugins (alias, resolve, css, json, wasm, worker, asset, etc.)
2. User `pre` plugins
3. User normal plugins
4. **`...buildPlugins.pre`** ← from `resolveBuildPlugins()`
5. User `post` plugins
6. **`...buildPlugins.post`** ← from `resolveBuildPlugins()`

The `resolveBuildPlugins()` function adds build-specific plugins including:

| Pre                    | Post                          |
| ---------------------- | ----------------------------- |
| `prepareOutDirPlugin`  | `buildImportAnalysisPlugin`   |
| `webWorkerPostPlugin`  | `buildEsbuildPlugin`          |
|                        | `terserPlugin`                |
|                        | `licensePlugin`               |
|                        | `manifestPlugin`              |
|                        | `ssrManifestPlugin`           |
|                        | `buildReporterPlugin`         |

Source: [vite/src/node/build.ts](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/build.ts)

All of these are assembled into `config.plugins` **before** `configResolved` runs, so your `stripUnneededPlugins` plugin _can_ see and remove them.

### The Real Culprit: Per-Environment Plugin Resolution

In Vite 8, the Environment API introduces per-environment plugin resolution via [`resolveEnvironmentPlugins()`](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugin.ts):

```
applyToEnvironment is called at config time, currently AFTER configResolved
```

This function iterates over `environment.getTopLevelConfig().plugins` and creates a **per-environment plugin array**. The plugins that get passed to Rolldown come from `environment.plugins`, not directly from `config.plugins`:

```ts
// In resolveRolldownOptions (build.ts):
const plugins = environment.plugins.map((p) =>
    injectEnvironmentToHooks(environment, chunkMetadataMap, p)
);
```

**If `environment.getTopLevelConfig().plugins` references the original (pre-mutation) array or a copy**, your `configResolved` mutation of `config.plugins` would not propagate to the environment-level plugin array.

Source: [Environment API for Plugins](https://main.vitejs.dev/guide/api-environment-plugins)

### Additionally: Some Plugins May Re-register

The plugins in the warning comment (`vite:terser`, `vite:worker`, `vite:css`) are created by factory functions during `resolvePlugins()`. Even if removed from the top-level `config.plugins`, the per-environment resolution may re-include them if they pass the `applyToEnvironment` check.

---

## 3. How Rolldown Differs from Rollup for Plugin Timing

| Aspect | Rollup (Vite <=7) | Rolldown (Vite 8) |
| --- | --- | --- |
| Plugin timing | `TIMING` env var opt-in | `checks.pluginTimings` default **on** |
| Implementation | JS-side measurement | Native Rust measurement of JS hook calls |
| Warning | None by default | Automatic warning when threshold exceeded |
| Measurable hooks | All | Only async JS hooks; sync callbacks waiting on `this.resolve`/`this.load` are inaccurate |

Source: [Rolldown docs - checks.pluginTimings](https://rolldown.rs/options/checks#plugintimings), [rolldown/rolldown#7559](https://github.com/rolldown/rolldown/issues/7559)

---

## 4. Official Stance on Disabling Built-in Plugins

Vite maintainers have explicitly **declined** to provide an official API for disabling built-in plugins:

> "Vite provides an opinionated set of plugins by default. We don't want to introduce a new option to disable it that could potentially break the app."
> — [Bjorn Lu (bluwy), vitejs/vite#11608](https://github.com/vitejs/vite/issues/11608)

The issue was closed as "not planned" and locked. Mutating `config.plugins` in `configResolved` remains an unsupported workaround.

---

## 5. Recommended Solutions

### Option A: Suppress the Warning via Rolldown Options

Disable the timing check in environment build options:

```ts
build: {
    rolldownOptions: {
        checks: { pluginTimings: false },
    },
}
```

This silences the warning without changing the plugin pipeline.

### Option B: Strip Plugins at the Environment Level

Instead of (or in addition to) mutating `config.plugins` in `configResolved`, use `applyToEnvironment` to filter plugins per-environment, or hook into the environment-level plugin resolution.

### Option C: Accept the Warning for Low-Cost Plugins

Per Rolldown's thresholds, the warning only fires when total build time > 3s and individual plugin time > 1s. If the plugins in question are consuming real time, suppressing the warning masks a real performance cost. If they are not, the warning may already be suppressed by the 3s threshold.

---

## References

- [Rolldown checks.pluginTimings docs](https://rolldown.rs/options/checks#plugintimings)
- [rolldown/rolldown#7559 - Adjust plugin timing warning](https://github.com/rolldown/rolldown/issues/7559)
- [vitejs/vite#11608 - Provide a way to disable internal plugins](https://github.com/vitejs/vite/issues/11608)
- [vitejs/vite discussions#21853 - Build times increased ~20% upgrading to Vite 8](https://github.com/vitejs/vite/discussions/21853)
- [Vite Environment API for Plugins](https://main.vitejs.dev/guide/api-environment-plugins)
- [vite/src/node/plugins/index.ts - resolvePlugins](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/index.ts)
- [vite/src/node/build.ts - resolveBuildPlugins](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/build.ts)
- [vite/src/node/plugin.ts - resolveEnvironmentPlugins](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugin.ts)
