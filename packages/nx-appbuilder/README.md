# Nx App Builder

The `@aligent/nx-appbuilder` package provides Nx generators for Adobe App Builder development. It scaffolds a workspace shell and individual App Builder apps inside an Nx monorepo, wired up against Aligent's `@adobe/aio-sdk` / `@adobe/aio-commerce-lib-*` conventions.

## Generators

### Preset Generator

The preset generator initialises a new App Builder monorepo. It is invoked indirectly via either `@aligent/create-workspace` (the Aligent-flavoured wrapper) or vanilla `create-nx-workspace`, and produces the workspace shell only — apps are added afterwards with the `app` generator.

#### Usage

```bash
# Recommended: the Aligent wrapper. Requires corepack to be enabled.
npx @aligent/create-workspace@latest --preset=@aligent/nx-appbuilder

# Or directly via create-nx-workspace (will prompt for nodeVersion if omitted):
npx create-nx-workspace@latest --preset=@aligent/nx-appbuilder
```

> The `@aligent/create-workspace` wrapper calls `create-nx-workspace` under the hood, prompts for the preset's options (workspace name, target Node.js version), and removes the npm-bootstrap artefacts (`package-lock.json`, `node_modules`, `.nx`) afterwards so the workspace is ready for `yarn install`.

#### Options

| Option | Type   | Required | Default | Description                                                                                                   |
|--------|--------|----------|---------|---------------------------------------------------------------------------------------------------------------|
| `name` | string | Yes      | -       | Workspace name (kebab-case). Used as the `@aligent/<name>` npm package name and the workspace directory name. |

#### Post-generation setup

After running the preset generator, configure the npm registry token before the first `npm install`:

- **`NPM_TOKEN`** — the generated `.npmrc` points `@aligent` at `https://npm.corp.aligent.consulting/` and reads `${NPM_TOKEN}` for auth. Generate a token by signing in to the registry with your GitHub account, then export it in your shell:

  ```bash
  export NPM_TOKEN=<your-token>
  ```

#### What it creates

The preset generator scaffolds:

- **Root configuration files**:
  - `package.json` - Workspace manifest with `lint` / `check-types` / `test` / `build` scripts (affected + run-many variants)
  - `nx.json` - Nx workspace configuration with cached `lint` / `check-types` / `test` / `build` target defaults
  - `.npmrc` - Aligent private registry configuration
  - `.nvmrc` - Pinned Node.js version (v22)
  - `.gitignore` - Standard ignores for Node, Nx, Parcel and Adobe AppBuilder
  - `prettier.config.mjs` - Workspace formatting defaults. Load-bearing for the `app` generator: Nx's `formatFiles()` resolves Prettier config from the workspace root on disk, so without this every generated app would be written at Prettier's 2-space/80-column defaults and then fail its own `npm run lint`.
  - `README.md` - Workspace-level usage guide

The preset does **not** scaffold any apps — see the `app` generator below.

### App Generator

The app generator creates a new Adobe App Builder app inside an existing workspace. The generator drives a series of prompts (or accepts CLI flags) that toggle which feature subtrees are rendered into the new app's directory.

#### Usage

```bash
npx nx g @aligent/nx-appbuilder:app <app-name>
```

Pass any of the feature flags below to skip the corresponding prompt, e.g.:

```bash
npx nx g @aligent/nx-appbuilder:app my-app \
    --hasAdminUI=true \
    --parentMenu=sales \
    --hasCommerceWebhooks=true
```

#### Options

| Option                  | Type    | Required | Default            | Description                                                                                                                                                 |
|-------------------------|---------|----------|--------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `name`                  | string  | Yes      | -                  | App name (kebab-case). Used as the directory name and the suffix of the `@aligent/<name>` package name.                                                     |
| `description`           | string  | No       | `''`               | Short description of the app, used in `package.json` and the generated README.                                                                              |
| `displayName`           | string  | No       | Title-cased `name` | Human-readable display name used in `app.commerce.config.ts` and the generated README.                                                                      |
| `hasAdminUI`            | boolean | No       | `false`            | Generates the Commerce backend UI extension (`commerce/backend-ui/2`) — a custom admin page and menu item, declared via `adminUi` in `app.commerce.config.ts`. |
| `parentMenu`            | enum    | No       | `none`             | Commerce admin menu the app's menu item sits under. One of `sales`, `catalog`, `customers`, `marketing`, `content`, `reports`, `stores`, `system`, `none` (top-level). Only used when `hasAdminUI=true`; prompted if omitted. |
| `hasBusinessConfig`     | boolean | No       | `false`            | Generates the Commerce configuration extension (`commerce/configuration/1`) — merchant-facing fields under Stores → Configuration.                          |
| `hasCommerceWebhooks`   | boolean | No       | `false`            | Adds a `webhooks` section to `app.commerce.config.ts` for binding Commerce extensibility hooks to runtime actions.                                          |
| `hasEvents`             | boolean | No       | `false`            | Generates a sample event handler under `src/actions/` and an `eventing` block in `app.commerce.config.ts` for Commerce + external event subscriptions.      |
| `hasRestActions`        | boolean | No       | `false`            | Generates a sample REST action under `src/actions/` and registers it in the runtime manifest.                                                               |
| `hasScheduledActions`   | boolean | No       | `false`            | Generates a sample cron-triggered action under `src/actions/` along with the `triggers` and `rules` entries that fire it.                                   |
| `hasCustomInstallSteps` | boolean | No       | `false`            | Generates an `installation` block in `app.commerce.config.ts` and a sample step under `scripts/install/`.                                                   |

> Setting `hasAdminUI`, `hasBusinessConfig`, or `hasCommerceWebhooks` automatically pulls in the `commerce-extensibility` subtree and the `@adobe/aio-commerce-lib-*` dependencies.

#### What it creates

The app generator always renders a **base** subtree into `<app-name>/`:

- **App-level files**:
  - `app.config.yaml` - App Builder manifest with the runtime package, action declarations, triggers and rules (composed from the selected flags)
  - `package.json` - Pinned dependencies and `lint` / `lint:fix` / `check-types` / `test` scripts (per-target variants for actions, web and tests). Apps are ESM (`"type": "module"`) — `@adobe/aio-commerce-lib-app` emits ESM into each extension's `.generated/`, which cannot load under CommonJS, so custom install-step scripts must be ESM too.
  - `package.json` `nx.targets` block - declares the custom `check-types` and `deploy` targets; `lint` and `test` are inferred by the `@nx/eslint/plugin` and `@nx/vitest` plugins from `eslint.config.mjs` and `vitest.config.ts`
  - `tsconfig.json` / `tsconfig.base.json` - TypeScript project config. The root project is the catch-all for everything the per-area projects miss — `global-types`, `vitest.config.ts`, shared code under `src/lib/`, and `app.commerce.config.ts` when a commerce flag is set. That last one matters: `adminUi` there drives the whole backend-ui/2 extension, so it needs to fail `check-types` rather than the build.
  - `package.json` `postinstall` (commerce apps only) - `[ -f .env ] && npx aio-commerce-lib-app hooks postinstall || true`, which regenerates `.generated/` right after install so a fresh clone is buildable without waiting for the first deploy. `aio-commerce-lib-app init` writes this script itself, but nothing else in the lib does, and this generator scaffolds `app.commerce.config.ts` directly rather than going through `init`. The `.env` guard keeps `npm install` working in CI, where no workspace is selected.
  - `eslint.config.mjs` / `prettier.config.mjs` - Lint and formatter config (`@aligent/ts-code-standards`). The eslint preset is `react` when `hasAdminUI=true` and `base` otherwise, so action-only apps don't load the React/JSX/a11y rules. The prettier config restates `tabWidth` / `printWidth` explicitly to match `.editorconfig`: `eslint-plugin-prettier` resolves config with `editorconfig: true` and Nx's `formatFiles()` does not, so leaving them implicit makes a freshly generated app fail its own `npm run lint`.
  - `vitest.config.ts` - Vitest config
  - `webpack-config.cjs` - App-root fallback webpack config that sets `experiments.typescript: false`. webpack ≥ 5.109 defaults that experiment to `"auto"`, which activates built-in TypeScript on Node ≥ 22.6 for any scope with no TS loader registered — and built-in TS then fails to resolve the `tsconfig` that some plain-JS transitive dependencies ship, breaking the SDK-generated `commerce/*` extension builds. `src/actions/webpack-config.cjs` still wins for the `application` scope.
  - `.editorconfig`, `.nvmrc`, `.gitignore`, `README.md`. The `.gitignore` covers `src/*/.generated/` (everything `@adobe/aio-commerce-lib-app` writes during `pre-app-build`) and the generated action-URL registry.

- **Action and test scaffolding**:
  - `src/actions/tsconfig.json` - TypeScript config for the App Builder actions
  - `src/actions/webpack-config.cjs` - Webpack config used by the `aio` CLI to compile actions via `esbuild-loader` (targets the workspace's Node major)
  - `tests/tsconfig.json` - TypeScript config for the test suite
  - `hooks/check-action-types.sh` - Wired as the application-level `pre-app-build` hook in `app.config.yaml` so the action TypeScript is type-checked before every deploy. Custom (non-Adobe) actions also live under `application.runtimeManifest` in `app.config.yaml`; the scaffolded `ext.config.yaml` files are left for Adobe-generated content only.
  - `global-types/@adobe/<pkg>/index.d.ts` - Local module augmentations for the targeted Adobe libs. Currently augments `@adobe/aio-lib-core-logging` with a strict `LogLevel` string-literal union; the layout mirrors `node_modules/` so additional augmentations can be dropped in alongside. Each file must open with an `import` of the package it augments — without a top-level import/export the file is a global script and `declare module` becomes an *ambient* declaration that replaces the package's real types instead of merging with them. (An ambient declaration is the right tool when the module genuinely doesn't exist yet — see `#app.commerce.config` below.)

- **Root updates**:
  - Adds `<app-name>` to the root `package.json` workspaces array

Additional subtrees are layered on top depending on the selected flags:

| Flag                                                            | Subtree rendered                          | Notable additions                                                                                                                                                                                                                                                        |
|-----------------------------------------------------------------|-------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| any of `hasAdminUI`, `hasBusinessConfig`, `hasCommerceWebhooks` | `commerce-extensibility/`                 | `app.commerce.config.ts`, `install.yaml`, `commerce/extensibility/1` extension config; pulls in `@adobe/aio-commerce-lib-app` / `-config`.                                                                                                                               |
| `hasAdminUI`                                                    | `commerce-backend-ui/`                    | React 19 + Spectrum S2 admin UI under `src/commerce-backend-ui-2/`. See [Admin UI](#admin-ui-commercebackend-ui2) below.                                                                                                                                                 |
| `hasBusinessConfig`                                             | `commerce-config/`                        | `commerce/configuration/1` extension config wired into `app.commerce.config.ts`; adds a `businessConfig.schema` block to `app.commerce.config.ts`.                                                                                                                       |
| `hasCommerceWebhooks`                                           | none (modifies `commerce-extensibility/`) | Adds a `webhooks` section to `app.commerce.config.ts` for binding Commerce extensibility hooks to runtime actions or external URLs. No new files; relies on the `commerce-extensibility/` subtree being rendered.                                                        |
| `hasRestActions`                                                | `rest-actions/`                           | `src/actions/rest-sample.ts` registered as a web action in `app.config.yaml`.                                                                                                                                                                                            |
| `hasEvents`                                                     | `events/`                                 | `src/actions/handle-sample-event.ts`, sample Commerce + external event subscriptions; pulls `@adobe/aio-lib-events` into the app's dependencies.                                                                                                                         |
| `hasScheduledActions`                                           | `scheduled/`                              | `src/actions/cron-sample.ts` plus the `triggers`/`rules` entries that fire it on a cron schedule.                                                                                                                                                                        |
| `hasCustomInstallSteps`                                         | `install-steps/`                          | `scripts/install/sample-step.js` and an `installation.customInstallationSteps` entry in `app.commerce.config.ts`.                                                                                                                                                        |

#### Example

```bash
# Standalone backend integration with REST actions and scheduled jobs
npx nx g @aligent/nx-appbuilder:app order-sync \
    --hasRestActions=true \
    --hasScheduledActions=true

# Commerce admin UI with business configuration and webhook bindings
npx nx g @aligent/nx-appbuilder:app loyalty-rules \
    --hasAdminUI=true \
    --parentMenu=customers \
    --hasBusinessConfig=true \
    --hasCommerceWebhooks=true
```

### Admin UI (`commerce/backend-ui/2`)

`@adobe/aio-commerce-lib-app` 1.8.0 removed `commerce/backend-ui/1` support and the `adminUiSdk` config key outright. Admin UI now lives at **`commerce/backend-ui/2`** under `src/commerce-backend-ui-2/`, and the extension itself — `ext.config.yaml`, the registration action, any worker-process declarations — is generated by the lib's `pre-app-build` hook from the **`adminUi`** key in `app.commerce.config.ts`. The generator seeds `ext.config.yaml` (because `app.config.yaml`'s `$include` is resolved before any hook runs) and otherwise leaves that file to the lib.

Beyond `adminUi.menu`, the section also accepts `order`, `product` and `customer` keys for grid columns, mass actions and order view buttons — see the [lib's usage guide](https://github.com/adobe/aio-commerce-sdk/blob/main/packages/aio-commerce-lib-app/docs/usage.md).

**Why the generator ships a `web-src`.** The lib will scaffold `web-src` itself, but only when `web-src/index.html` is absent — and that same code path writes `web-src/tsconfig.json` unconditionally, which would overwrite ours. Shipping `index.html` makes `generateWebSrc()` return early, so the `@aligent/ts-code-standards` config and the helpers below survive. The trade-off is that the generator also has to declare what the lib's `prepareWebSourcePackage()` would have added: the web dependencies (`react`, `react-dom`, `@react-spectrum/s2`, `@adobe/aio-commerce-lib-admin-ui`), the `#web/*` subpath alias, and the Parcel `manualSharedBundles` / `packageExports` blocks. All of those live in `compose-package-json.ts`.

What lands under `src/commerce-backend-ui-2/web-src/`:

- `src/app.tsx` - The whole bootstrap. `createExtensionApp()` from `@adobe/aio-commerce-lib-admin-ui/web` handles UIX registration, shared-context attach, routing and the Spectrum provider, replacing the hand-rolled `ExtensionRegistration` / `AdobeRuntimeContextProvider` / `PageContextProvider` components the generator used to ship. Read IMS credentials with `useIms()`.
- `src/pages/main-page.tsx` - The page opened from the admin menu item.
- `src/lib/callAction.ts`, `src/hooks/useAppBuilderAction.ts`, `src/hooks/useLazyAppBuilderAction.ts`, `src/types/ActionName.ts` - Typed action invocation. `useAppBuilderAction` injects the host's IMS credentials from `useIms()` and holds the request until they arrive, so actions annotated `require-adobe-auth: true` don't get an unauthenticated first call.
- `tsconfig.json` - Extends `@aligent/ts-code-standards/tsconfigs-react` with `module: Preserve` / `moduleResolution: Bundler`. Bundler resolution is what lets TypeScript resolve the `#web/*` and `#app.commerce.config` package.json import aliases, so there is no `paths` mapping.
- `src/web-env.d.ts`, `src/action-urls.generated.json.d.ts` - Ambient declarations for imports that only exist after a build (`.generated/` and the action registry are both gitignored), so `check-types` passes on a fresh clone.

**The `#app.commerce.config` alias.** `aio-commerce-lib-app` adds this to `package.json` on every `pre-app-build`, pointing at `src/commerce-extensibility-1/.generated/app.commerce.config.js`. The path is the same whichever branch runs — a bundled module for dynamic schemas or named exports, a re-export of the static manifest otherwise. It exists for the actions the lib itself generates, and both reference apps confirm it: nothing hand-written imports it.

If app code does import it, the fix is an ambient declaration under `global-types/`, **not** a hand-added `package.json` entry. The alias target is gitignored, so before the first build TypeScript resolves it to a missing file and reports `Cannot find module` regardless of what `imports` says. `web-src/src/web-env.d.ts` does exactly this for the admin UI shell; the generated app README shows the equivalent for actions.

**Action URL registry.** `aio app build` writes a `config.json` per extension containing only *that* extension's action URLs — and a `backend-ui/2` extension has no web actions of its own, so actions declared under `application.runtimeManifest` are invisible to the UI. `scripts/generate-action-registry.mjs` (wired in as a `pre-app-build` hook) instead captures `aio app get-url --json`, which resolves every scope statically with no network call, and writes it to `web-src/src/action-urls.generated.json` for `callAction` to read. It fails loudly rather than writing a broken registry if no workspace is selected — run `aio app use` first.

### App Builder guardrails

The generated `eslint.config.mjs` ships four rules on top of `@aligent/ts-code-standards`. Each was added to head off a pattern that has repeatedly bitten App Builder apps:

| Rule                                           | Scope               | Why                                                                                                                                                                                                                                                                  |
|------------------------------------------------|---------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `no-restricted-imports` on `@adobe/aio-sdk`    | `src/**/*.{ts,tsx}` | The umbrella `@adobe/aio-sdk` re-exports every sub-SDK (Files, State, Events, Target, Analytics, ...). Import the targeted lib instead — `@adobe/aio-lib-core-logging` for Logger, `@adobe/aio-lib-core-config` for Config, `@adobe/aio-lib-events` for Events, etc. |
| `@typescript-eslint/no-non-null-assertion`     | `src/**/*.{ts,tsx}` | `x!` silently swallows runtime null/undefined, which surfaces as opaque action 500s. Aligns with the workspace's `CLAUDE.md` rule.                                                                                                                                   |
| `@typescript-eslint/prefer-nullish-coalescing` | `src/**/*.{ts,tsx}` | `params.MAX_RETRIES \|\| 3` treats a valid `0` as missing and forces the fallback; `??` only triggers on null/undefined, preserving legitimate falsy values (`0`, `false`, `''`).                                                                                    |
| `no-restricted-syntax` (`process.env`)         | `src/**/actions/**` | App Builder routes runtime configuration through OpenWhisk `params`; `process.env` is not reliably propagated between activations. Read from `params` (declared under `inputs:` in `app.config.yaml`) instead.                                                       |

To loosen any rule for a specific case, override it in the same `eslint.config.mjs` (later config blocks win); to disable globally, remove the entry from the block.

Because the umbrella import is banned, the generator no longer ships `@adobe/aio-sdk` as a dep. Instead it pins `@adobe/aio-lib-core-logging` unconditionally (used by every sample action) and `@adobe/aio-lib-events` only when `--hasEvents=true`. Add additional targeted libs (`@adobe/aio-lib-state`, `@adobe/aio-lib-files`, `@adobe/aio-lib-core-config`, ...) to your generated app's `package.json` as the action code that uses them is added.

## Project Structure

After running the preset generator and adding one or more apps, your workspace will look like:

```
my-workspace/
├── my-app/
│   ├── src/
│   │   ├── actions/
│   │   │   ├── tsconfig.json
│   │   │   └── ...               # rest / event / cron action samples (per flag)
│   │   ├── commerce-backend-ui-2/  # only if hasAdminUI
│   │   ├── commerce-configuration-1/  # only if hasBusinessConfig
│   │   └── commerce-extensibility-1/  # only if any commerce-lib flag
│   ├── tests/
│   ├── hooks/
│   ├── global-types/
│   ├── scripts/install/          # only if hasCustomInstallSteps
│   ├── app.config.yaml
│   ├── app.commerce.config.ts    # only if any commerce-lib flag
│   ├── install.yaml              # only if any commerce-lib flag
│   ├── webpack-config.cjs
│   ├── package.json              # includes nx.targets for check-types and deploy
│   └── ...
├── nx.json
├── package.json
├── prettier.config.mjs
├── .npmrc
└── .nvmrc
```

## Development

### Building

```bash
npx nx build nx-appbuilder
```

The `@nx/js:tsc` build executor compiles `src/**/*.ts` to `dist/src/` and copies the templates under `src/generators/<gen>/files/` verbatim. Template files use the `.template` suffix (e.g. `app.commerce.config.ts.template`) so they aren't picked up by lint or `tsc`; `@nx/devkit`'s `generateFiles` strips the suffix at generation time.

#### Dependency version pins

Each generator reads the npm version specs it injects into generated files from a real `package.json` at `src/generators/<gen>/template-package/package.json`:

- `preset/template-package/package.json` pins the workspace-level devDeps (`nx`, `@nx/*` plugins, `eslint`, `prettier`, `typescript`, `vitest`, `@aligent/ts-code-standards`).
- `app/template-package/package.json` pins the per-app deps (`@adobe/aio-*`, React + Spectrum, lint/test tooling, etc.).

Both files are tracked by Dependabot (see `.github/dependabot.yml`) so version bumps land via PR. To add a new pin, add it to the relevant template-package and reference it from `pickVersions()` in `preset.ts` / `compose-package-json.ts`. The shared helper at `src/generators/helpers/template-package.ts` enforces that every requested key exists in the template file, so missing pins fail loudly at runtime.

Three pins are coupled and should move together:

- **`eslint` must match across both files**, since npm workspaces hoists a single copy. The ceiling is set by `@aligent/ts-code-standards`, whose bundled `eslint-plugin-react@7` calls the `context.getFilename()` API that ESLint 10 removed. `ts-code-standards@5.0.1` wraps the plugin in `fixupPluginRules` from `@eslint/compat`, which is what makes ESLint 10 viable — on 5.0.0 or earlier, any app using the `react` preset (i.e. `hasAdminUI`) dies with `contextOrFilename.getFilename is not a function`.
- **`typescript` is floored by `@adobe/aio-commerce-lib-app`**, which since 1.10.0 optionally peers `typescript ^6.0.3`; pairing it with a `^5` pin fails `npm install` with `ERESOLVE`. It's also ceilinged by `typescript-eslint@8` (`>=4.8.4 <6.1.0`), so TypeScript 7 is not yet reachable even though it has shipped.
- **`baseUrl` must stay out of the generated tsconfigs.** TypeScript 6 reports it as deprecated (TS5101) and 7 drops it, so `paths` entries carry their prefix explicitly and resolve relative to the config that declares them.

### Running tests / lint / type-check

```bash
npx nx test nx-appbuilder
npx nx lint nx-appbuilder
npx nx typecheck nx-appbuilder
```

### Local testing

To try the generator locally against a sibling workspace without publishing:

```bash
# In the consumer workspace:
npm install --save-dev /absolute/path/to/packages/nx-appbuilder
npx nx g @aligent/nx-appbuilder:app my-app
```

Or use the local Verdaccio registry — see the root `CLAUDE.md` for the `nx start-local-registry` workflow.

## License

MIT
