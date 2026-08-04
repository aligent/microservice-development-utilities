# Migrate from Rolldown to Vite

## Overview

This branch replaces **Rolldown** with **Vite** as the Lambda bundler and upgrades the Nx toolchain, ESLint, Vitest, and other dependencies to their latest major versions.

---

## Bundler: Rolldown → Vite

| Before                                                                         | After                                                                                                  |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `rolldown.config.base.mjs` + per-service `rolldown.config.mjs`                 | `vite.config.base.mjs` + per-service `vite.config.mjs`                                                 |
| `rolldown -c rolldown.config.mjs --environment BUNDLE_MODE:{args.bundle-mode}` | `vite build --mode {args.mode}`                                                                        |
| Separate `vitest.config.base.mjs` for tests                                    | Unified `vite.config.base.mjs` exports both `baseConfig` (test) and `defineLambdaEnvironments` (build) |

### Key design decisions

- **Vite Environment API**: Each Lambda handler gets its own Vite environment via `defineLambdaEnvironments()`, enabling parallel builds within a single `vite build` invocation.
- **Unified config**: Test config (`vitest`) and build config (`vite build`) now share a single `vite.config.mjs` per service, eliminating the need for separate `vitest.config.mjs` files in services.
- **ESM shim banner** is preserved for `__filename`/`__dirname` compatibility.
- **Strips unneeded Vite plugins** via `stripUnneededPlugins` — removes built-in plugins that don't apply to Node.js Lambda bundling:

  | Plugin                        | Why removed                                              |
  | ----------------------------- | -------------------------------------------------------- |
  | `vite:watch-package-data`     | Watches `package.json` for HMR — no HMR in builds        |
  | `vite:modulepreload-polyfill` | Browser `<link rel=modulepreload>` — no browser          |
  | `vite:html-inline-proxy`      | Inline scripts in HTML — no HTML                         |
  | `vite:css`                    | CSS parsing/transforms — no CSS                          |
  | `vite:css-post`               | CSS post-processing — no CSS                             |
  | `vite:css-analysis`           | CSS dependency analysis — no CSS                         |
  | `vite:wasm-helper`            | WASM loading for browsers                                |
  | `vite:worker`                 | Web Workers — no browser                                 |
  | `vite:worker-import-meta-url` | Web Worker URL resolution — no browser                   |
  | `vite:asset`                  | Static asset handling (images, fonts) — no static assets |
  | `vite:asset-import-meta-url`  | `new URL('asset', import.meta.url)` for assets           |
  | `vite:build-html`             | HTML entry processing — no HTML                          |
  | `vite:client-inject`          | HMR client injection — no HMR                            |
  | `vite:forward-console`        | Forwards console to Vite overlay — dev server only       |
  | `vite:terser`                 | Terser minifier — uses `oxc` instead                     |
  | `vite:ssr-manifest`           | SSR manifest generation — not doing SSR                  |

- **VITEST guard**: Lambda environments are skipped when `process.env.VITEST === 'true'` so test runs don't trigger builds.

### Removed files

- `rolldown.config.base.mjs`
- `vitest.config.base.mjs`
- All per-service `rolldown.config.mjs` (inventory, orders, persons, products, stores)
- All per-service `vitest.config.mjs` (orders, persons, products, stores) — replaced by unified `vite.config.mjs`

---

## Nx Plugin Change

- Replaced `@nx/vitest` plugin with `@nx/vite/plugin` in `nx.json`.
- Added `neverConnectToCloud: true` and `analytics: false` to `nx.json`.
- Added `projectType` to all service and library `package.json` Nx configs.

## Dependency Upgrades

| Package                | Before  | After                            |
| ---------------------- | ------- | -------------------------------- |
| `nx`                   | 22.1.3  | 22.7.3                           |
| `@nx/*` packages       | 22.1.3  | 22.7.5                           |
| `vite`                 | ^7.2.6  | ^8.0.14                          |
| `vitest`               | ^3.2.4  | ^4.1.7                           |
| `eslint`               | ^9.32.0 | ^10.4.0                          |
| `eslint-plugin-import` | ^2.32.0 | `eslint-plugin-import-x` ^4.16.2 |
| `@typescript-eslint/*` | 8.44.0  | ^8.61.1                          |
| `prettier`             | ^3.6.2  | ^3.8.3                           |
| `yarn`                 | 4.12.0  | 4.17.0                           |

- **Removed**: `rolldown` (1.0.0-rc.1)
- **Added**: `@nx/vite` (22.7.5), `@aws-sdk/client-s3` (^3.1073.0)
- Several pinned versions changed to caret ranges (e.g. `@aligent/aws-wrappers`, `@aligent/cdk-aspects`, `@aligent/nx-cdk`).

## ESLint Config Changes

- Root `eslint.config.mjs`: switched from `eslint-plugin-import` to `eslint-plugin-import-x`.
- Per-service and lib configs: simplified formatting (collapsed multi-line exports to single-line where possible).

## Package.json Changes Across Services

All services (`inventory`, `orders`, `persons`, `products`, `stores`):

- Build command changed from `rolldown` to `vite build`.
- Added `projectType: "library"` to Nx config.
- Cleaned up `bundleDependencies` ordering; removed `dayjs` and `es-toolkit` from products' bundle deps.

`libs/runtime`:

- Changed `clients` from `dependencies` (`"clients": "workspace:*"`) to `bundleDependencies`.
- Added `projectType: "library"`.

`application`:

- Added `bundleDependencies` listing all libs and services.
- Added `projectType: "application"`.
- CDK target simplified to a bare `"command": "cdk"` — Nx forwards all arguments (subcommand, stack selector, context flags) directly to the CDK CLI.

## Misc

- `.gitignore`: updated to track `vite.config.base.mjs` instead of `rolldown.config.base.mjs` and `vitest.config.base.mjs`.
- `.yarnrc.yml`: added `enableScripts: true` and `npmMinimalAgeGate: '3d'`.
