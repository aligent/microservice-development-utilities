# CLAUDE.md

## Project Overview

Aligent's TypeScript monorepo for microservice development utilities.

## Packages

| Package                          | Purpose                                                       |
| -------------------------------- | ------------------------------------------------------------- |
| `packages/appbuilder-util-lib`   | Adobe App Builder utilities (logging, DB, files, state, auth) |
| `packages/aws-wrappers`          | Opinionated AWS SDK wrappers with Powertools logging + X-Ray  |
| `packages/create-workspace`      | CLI scaffolding tool for new Nx workspaces                    |
| `packages/lambda-test-utils`     | Test utilities for API Gateway-attached Lambda handlers       |
| `packages/microservice-util-lib` | Core utilities (AWS SDK, OAuth, OpenAPI clients)              |
| `packages/nx-appbuilder`         | Nx plugin with generators for Adobe App Builder apps          |
| `packages/nx-cdk`                | Nx plugin with generators for AWS CDK projects                |
| `packages/nx-openapi`            | Nx plugin with generators for OpenAPI client generation       |
| `packages/vite-plugin-handler`   | Vite plugin for bundling Lambda handlers as ESM               |

## Commands

Run all checks at the repo root — never per-project nx run variants:

```bash

# Lint / Type-check / Test — affected packages only
npm run lint
npm run check-types
npm run test

# Generate a new package
npx nx g @tools/generators:package
```

### Build tooling

- **Prefer `@nx/rollup` for new packages that need to be dual-published as CJS + ESM.** See `packages/aws-wrappers` for the reference setup (`rollup.config.mjs`, `project.json` with `build` + `package-dist` targets, single `tsconfig.lib.json` overriding `module: ESNext` / `moduleResolution: Bundler`). The pattern is documented in detail in `packages/aws-wrappers/CLAUDE.md` under "Build layout". Avoid hand-rolling a dual-`tsc` chain via `nx:run-commands` — it works but doesn't compose cleanly with Nx's plugin model and duplicates the tsconfig per format.

### TypeScript

- **Never use the non-null assertion operator (`!`)**. Use explicit runtime checks instead so errors surface with a clear message rather than a runtime crash.

  ```ts
  // Bad
  const content = tree.read(path, 'utf-8')!;

  // Good
  const content = tree.read(path, 'utf-8');
  if (content === null) {
    throw new Error(`Failed to read file: ${path}`);
  }
  ```

### Adobe App Builder action code

- **Never import the umbrella `@adobe/aio-sdk`.** It re-exports every sub-SDK (Files, State, Events, Target, Analytics, …) so the action bundle inflates with code it doesn't use. Import the targeted lib instead:

  ```ts
  // Bad — drags every sub-SDK into the bundle
  import { Core } from '@adobe/aio-sdk';
  const logger = Core.Logger('action');

  // Good — only the lib you actually use
  import Logger from '@adobe/aio-lib-core-logging';
  const logger = Logger('action');
  ```

  Common mappings: `Core.Logger` → `@adobe/aio-lib-core-logging`, `Core.Config` → `@adobe/aio-lib-core-config`, `Events` → `@adobe/aio-lib-events`, `State` → `@adobe/aio-lib-state`, `Files` → `@adobe/aio-lib-files`. The generated app's `eslint.config.mjs` ships a `no-restricted-imports` rule that enforces this.

- **Don't read `process.env` inside action handlers.** App Builder routes runtime configuration through OpenWhisk `params` (declared as `inputs:` in `app.config.yaml`); `process.env` is not reliably propagated between activations. The generated app's eslint config flags `process.env.*` reads under `src/**/actions/**`.

- **App Builder apps are ESM (`"type": "module"`).** `@adobe/aio-commerce-lib-app` emits ESM into each extension's `.generated/` directory (including JSON import attributes), which cannot load under CommonJS. Custom installation-step scripts must therefore use `export default`, not `module.exports`.

- **Admin UI is `commerce/backend-ui/2`, driven by `adminUi`.** `@adobe/aio-commerce-lib-app` 1.8.0 removed `commerce/backend-ui/1` and the `adminUiSdk` config key. Declare menu items, grid columns, mass actions and order view buttons under `adminUi` in `app.commerce.config.ts`; the lib generates `src/commerce-backend-ui-2/ext.config.yaml` and the registration action from it during `pre-app-build`. Don't hand-write either. (The public Admin UI SDK docs still describe `backend-ui/1` — that's the pre-SDK path.)

- **A `.d.ts` that augments a package must import it first.** Without a top-level `import`/`export` the file is a global script, so `declare module 'pkg'` declares an *ambient* module that replaces the package's real types instead of merging with them — e.g. `Logger('name')` then fails with "This expression is not callable".

  ```ts
  // Good — a module augmentation
  import '@adobe/aio-lib-core-logging';

  declare module '@adobe/aio-lib-core-logging' {
      export type LogLevel = 'error' | 'warn' | 'info';
  }
  ```

## Workflow

- Whenever the user says "No" or corrects an approach, update this file with the relevant rule so the same mistake is not repeated.
- After completing a task, search for and update any related documentation (READMEs, docs/ files, CLAUDE.md) that references the modified code before offering to commit. For larger features, treat this as an implicit final step.
- Always run `/review` before creating a Pull Request.
- Check for version plan in `.nx/version-plan` and create one using `npm run release-plan` if needed.
- Always create Pull Request using provided `pull_request_template.md`.
