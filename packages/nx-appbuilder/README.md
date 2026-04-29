# Nx App Builder

The `@aligent/nx-appbuilder` package provides Nx generators for Adobe App Builder development. It scaffolds a workspace shell and individual App Builder apps inside an Nx monorepo, wired up against Aligent's `@adobe/aio-sdk` / `@adobe/aio-commerce-lib-*` conventions.

## Generators

### Preset Generator

The preset generator initialises a new App Builder monorepo. It is invoked indirectly via `create-nx-workspace` and produces the workspace shell only — apps are added afterwards with the `app` generator.

#### Usage

```bash
npx create-nx-workspace@latest --preset=@aligent/nx-appbuilder
```

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
    --sidebarCategory=sales \
    --hasCommerceWebhooks=true
```

#### Options

| Option                  | Type    | Required | Default            | Description                                                                                                                                                 |
|-------------------------|---------|----------|--------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `name`                  | string  | Yes      | -                  | App name (kebab-case). Used as the directory name and the suffix of the `@aligent/<name>` package name.                                                     |
| `description`           | string  | No       | `''`               | Short description of the app, used in `package.json` and the generated README.                                                                              |
| `displayName`           | string  | No       | Title-cased `name` | Human-readable display name used in `app.commerce.config.ts` and the generated README.                                                                      |
| `hasAdminUI`            | boolean | No       | `false`            | Generates the Commerce backend UI extension (`commerce/backend-ui/1`) — custom admin pages and sidebar menu items.                                          |
| `sidebarCategory`       | enum    | No       | `none`             | Sidebar category for the admin menu item. One of `catalog`, `sales`, `customers`, `content`, `none`. Only used when `hasAdminUI=true`; prompted if omitted. |
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
  - `package.json` - Pinned dependencies and `lint` / `lint:fix` / `check-types` / `test` scripts (per-target variants for actions, web and tests)
  - `project.json` - Nx targets (`lint`, `lint:fix`, `check-types`, `test`, `deploy`) wired to the app's npm scripts
  - `tsconfig.json` / `tsconfig.base.json` - TypeScript project config
  - `babel.actions.config.js` - Babel preset for App Builder actions
  - `eslint.config.mjs` / `prettier.config.mjs` - Lint and formatter config (`@aligent/ts-code-standards`)
  - `vitest.config.ts` - Vitest config
  - `.editorconfig`, `.nvmrc`, `.gitignore`, `README.md`

- **Action and test scaffolding**:
  - `src/actions/tsconfig.json` - TypeScript config for the App Builder actions
  - `tests/tsconfig.json` - TypeScript config for the test suite
  - `hooks/check-action-types.sh` - `pre-app-build` hook that type-checks actions before deploy
  - `global-types/@adobe/aio-sdk/*.d.ts` - Local type augmentations for the Adobe AIO SDK

- **Root updates**:
  - Adds `<app-name>` to the root `package.json` workspaces array

Additional subtrees are layered on top depending on the selected flags:

| Flag                                                            | Subtree rendered                          | Notable additions                                                                                                                                                                                                 |
|-----------------------------------------------------------------|-------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| any of `hasAdminUI`, `hasBusinessConfig`, `hasCommerceWebhooks` | `commerce-extensibility/`                 | `app.commerce.config.ts`, `install.yaml`, `commerce/extensibility/1` extension config; pulls in `@adobe/aio-commerce-lib-app` / `-config`.                                                                        |
| `hasAdminUI`                                                    | `commerce-backend-ui/`                    | React 19 + Spectrum admin UI under `src/commerce-backend-ui-1/`, `web-src/` entry point, action utils, registration, `pre-app-build` web type-check hook.                                                         |
| `hasBusinessConfig`                                             | `commerce-config/`                        | `commerce/configuration/1` extension config wired into `app.commerce.config.ts`; adds a `businessConfig.schema` block to `app.commerce.config.ts`.                                                                |
| `hasCommerceWebhooks`                                           | none (modifies `commerce-extensibility/`) | Adds a `webhooks` section to `app.commerce.config.ts` for binding Commerce extensibility hooks to runtime actions or external URLs. No new files; relies on the `commerce-extensibility/` subtree being rendered. |
| `hasRestActions`                                                | `rest-actions/`                           | `src/actions/rest-sample.ts` registered as a web action in `app.config.yaml`.                                                                                                                                     |
| `hasEvents`                                                     | `events/`                                 | `src/actions/handle-sample-event.ts`, sample Commerce + external event subscriptions, `aio-lib-events` global types.                                                                                              |
| `hasScheduledActions`                                           | `scheduled/`                              | `src/actions/cron-sample.ts` plus the `triggers`/`rules` entries that fire it on a cron schedule.                                                                                                                 |
| `hasCustomInstallSteps`                                         | `install-steps/`                          | `scripts/install/sample-step.js` and an `installation.customInstallationSteps` entry in `app.commerce.config.ts`.                                                                                                 |

#### Example

```bash
# Standalone backend integration with REST actions and scheduled jobs
npx nx g @aligent/nx-appbuilder:app order-sync \
    --hasRestActions=true \
    --hasScheduledActions=true

# Commerce admin UI with business configuration and webhook bindings
npx nx g @aligent/nx-appbuilder:app loyalty-rules \
    --hasAdminUI=true \
    --sidebarCategory=customers \
    --hasBusinessConfig=true \
    --hasCommerceWebhooks=true
```

## Project Structure

After running the preset generator and adding one or more apps, your workspace will look like:

```
my-workspace/
├── my-app/
│   ├── src/
│   │   ├── actions/
│   │   │   ├── tsconfig.json
│   │   │   └── ...               # rest / event / cron action samples (per flag)
│   │   ├── commerce-backend-ui-1/  # only if hasAdminUI
│   │   ├── commerce-configuration-1/  # only if hasBusinessConfig
│   │   └── commerce-extensibility-1/  # only if any commerce-lib flag
│   ├── tests/
│   ├── hooks/
│   ├── global-types/
│   ├── scripts/install/          # only if hasCustomInstallSteps
│   ├── app.config.yaml
│   ├── app.commerce.config.ts    # only if any commerce-lib flag
│   ├── install.yaml              # only if any commerce-lib flag
│   ├── project.json
│   ├── package.json
│   └── ...
├── nx.json
├── package.json
├── .npmrc
└── .nvmrc
```

## Development

### Building

```bash
npx nx build nx-appbuilder
```

The `@nx/js:tsc` build executor compiles `src/**/*.ts` to `dist/src/` and copies the templates under `src/generators/<gen>/files/` verbatim. Template files use the `.template` suffix (e.g. `app.commerce.config.ts.template`) so they aren't picked up by lint or `tsc`; `@nx/devkit`'s `generateFiles` strips the suffix at generation time.

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
