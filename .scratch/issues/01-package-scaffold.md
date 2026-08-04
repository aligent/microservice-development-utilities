# MI-251: Package scaffold — ESM config, vite peer dep, tsconfig

## Parent

MI-251 / `.scratch/MI-251-vite-plugin-lambda-prd.md`

## What to build

Configure the `@aligent/vite-plugin-handler` package at `packages/vite-plugin-handler` as a publishable ESM-only library with a peer dependency on Vite.

- `package.json`: set `"type": "module"`, point `main` and `typings` at `dist/` outputs, add `peerDependencies: { "vite": ">=8.0.0" }`, remove placeholder `description`.
- `tsconfig.lib.json`: ensure `module` and `moduleResolution` are compatible with ESM output (e.g. `"module": "ESNext"`, `"moduleResolution": "Bundler"`).
- `project.json`: confirm `@nx/js:tsc` executor is configured correctly for the ESM output.
- Delete the placeholder `src/lib/hello.ts` and `src/lib/hello.spec.ts` files.

## Acceptance criteria

- [ ] `package.json` has `"type": "module"` and `peerDependencies` includes `"vite": ">=8.0.0"`
- [ ] `main` and `typings` fields in `package.json` point to `dist/` (e.g. `./dist/index.js`, `./dist/index.d.ts`)
- [ ] Placeholder `hello.ts` and `hello.spec.ts` are removed
- [ ] `npx nx build vite-plugin-handler` succeeds (even if the only export is an empty barrel)
- [ ] Package builds as ESM (no CJS output)

## Blocked by

None - can start immediately
