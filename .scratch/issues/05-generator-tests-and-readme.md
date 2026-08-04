# MI-251: Generator test assertions & package README

## Parent

MI-251 / `.scratch/MI-251-vite-plugin-lambda-prd.md`

## What to build

Update the existing preset generator spec and write the package README.

### Generator test updates

In `packages/nx-cdk/src/generators/preset/preset.spec.ts`, add assertions that verify the generated files reflect the new plugin usage:

- Generated `vite.config.base.mjs` does NOT contain `defineLambdaEnvironments`, `shimBanner`, or `stripUnneededPlugins`
- Generated `package.json` includes `@aligent/vite-plugin-handler` in `devDependencies`
- Generated service `vite.config.mjs` imports from `@aligent/vite-plugin-handler`

Follow the existing test pattern using `createTreeWithEmptyWorkspace()` and reading generated file contents.

### README

Update `packages/vite-plugin-handler/README.md` with:

- Package description and purpose
- Installation instructions
- Basic usage example showing `handlerBundle` in a Vite config
- Options documentation (`concurrency`, `shims`, `moduleTypes`)

## Acceptance criteria

- [ ] `preset.spec.ts` asserts generated `vite.config.base.mjs` does not contain old bundling code
- [ ] `preset.spec.ts` asserts generated `package.json` includes `@aligent/vite-plugin-handler`
- [ ] All existing and new generator tests pass
- [ ] `README.md` documents the public API with a usage example
- [ ] `yarn test` and `npm run lint` pass from the repo root

## Blocked by

- 04 — Generator templates
