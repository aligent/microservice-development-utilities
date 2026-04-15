# CLAUDE.md

## Working With Claude

Whenever the user says "No" or corrects an approach, update this file with the relevant rule so the same mistake is not repeated.

## Project Overview

Aligent's TypeScript monorepo for microservice development utilities. Managed by **Nx 22** with **npm workspaces**. Node.js v22 required (see `.nvmrc`).

## Packages

| Package | Purpose |
|---------|---------|
| `packages/appbuilder-util-lib` | Adobe App Builder utilities (logging, DB, files, state, auth) |
| `packages/create-workspace` | CLI scaffolding tool for new Nx workspaces |
| `packages/microservice-util-lib` | Core utilities (AWS SDK, OAuth, OpenAPI clients) |
| `packages/nx-cdk` | Nx plugin with generators for AWS CDK projects |
| `packages/nx-openapi` | Nx plugin with generators for OpenAPI client generation |

## Common Commands

```bash
# Install dependencies
npm install

# Build / Test / Lint / Type-check — affected packages only
npm run build
npm test
npm run lint
npm run check-types

# Run across all packages
npm run build:all
npm run test:all
npm run lint:all
npm run check-types:all

# Single package
npx nx build @aligent/microservice-util-lib
npx nx test @aligent/nx-cdk

# Preview generator changes without writing files
npx nx g @tools/generators:package --dry-run
npx nx g @aligent/nx-cdk:service --dry-run
```

## Testing

- Framework: **Vitest** with v8 coverage provider
- Coverage threshold: **80%** across branches, functions, lines, and statements
- Tests live alongside source in `src/` or under `tests/`, matching `**/*.{test,spec}.ts`
- Files prefixed with `/* v8 ignore start */` are excluded from coverage

## Code Style

- **4-space indentation** (2 for YAML/JSON — see `.editorconfig`)
- **LF** line endings, **100-char** max line width
- Linting via `@aligent/ts-code-standards` (ESLint + Prettier)
- Run `npm run lint` before committing; pre-commit hooks are configured via `prepare`

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

## Architecture Notes

### NX Generators

Generators in `packages/nx-cdk` and `packages/nx-openapi` must route **all file I/O through the NX `Tree`** object — never use `fs` or third-party APIs (e.g. `ts-morph`'s `.save()`) to write directly to disk. This ensures `--dry-run` works correctly, as NX handles dry-run by not flushing the Tree.

- Use `tree.read()` / `tree.write()` / `tree.exists()` instead of `fs.*` / `existsSync`
- When using `ts-morph` for AST manipulation, use `InMemoryFileSystemHost` and write the result back via `tree.write()`

### TypeScript Project References

The root `tsconfig.json` uses project references. When adding a new package or service, the reference must be added via `addTsConfigReference()` (which updates `tsconfig.json` through the Tree).

### Release Process

Independent versioning per package using **Nx Version Plans**.

1. Create a `releases/*` branch from `main`
2. Run `npm run release-plan` to generate a version plan file in `.nx/version-plans/`
3. Push — the `release` workflow bumps versions, removes the plan file, and opens a "Publish" PR
4. Merge the Publish PR → `publish` workflow builds and publishes to npm

> Only one version plan file should exist at a time. Multiple plans produce unpredictable results.

## Branch Naming

- Features: `feat/MI-{issue}-{description}`
- Fixes: `fix/MI-{issue}-{description}`
- Releases: `releases/{package-name}-{version}`

## Local Registry Testing

```bash
npx nx start-local-registry microservice-development-utilities
npx nx release publish   # publish to local Verdaccio registry
npx nx stop-local-registry microservice-development-utilities
```
