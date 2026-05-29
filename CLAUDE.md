# CLAUDE.md

## Project Overview

Aligent's TypeScript monorepo for microservice development utilities.

## Packages

| Package                          | Purpose                                                       |
| -------------------------------- | ------------------------------------------------------------- |
| `packages/appbuilder-util-lib`   | Adobe App Builder utilities (logging, DB, files, state, auth) |
| `packages/aws-wrappers`          | Opinionated AWS SDK wrappers with Powertools logging + X-Ray  |
| `packages/create-workspace`      | CLI scaffolding tool for new Nx workspaces                    |
| `packages/microservice-util-lib` | Core utilities (AWS SDK, OAuth, OpenAPI clients)              |
| `packages/nx-appbuilder`         | Nx plugin with generators for Adobe App Builder apps          |
| `packages/nx-cdk`                | Nx plugin with generators for AWS CDK projects                |
| `packages/nx-openapi`            | Nx plugin with generators for OpenAPI client generation       |

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

## Workflow

- Whenever the user says "No" or corrects an approach, update this file with the relevant rule so the same mistake is not repeated.
- After completing a task, search for and update any related documentation (READMEs, docs/ files, CLAUDE.md) that references the modified code before offering to commit. For larger features, treat this as an implicit final step.
- Always run `/review` before creating a Pull Request.
- Check for version plan in `.nx/version-plan` and create one using `npm run release-plan` if needed.
- Always create Pull Request using provided `pull_request_template.md`.
