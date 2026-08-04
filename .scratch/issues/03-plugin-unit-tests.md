# MI-251: Plugin unit tests for `handlerBundle`

## Parent

MI-251 / `.scratch/MI-251-vite-plugin-lambda-prd.md`

## What to build

Write unit tests for the `handlerBundle` plugin in `src/lib/handler-bundle.spec.ts`. Mock `globSync` to simulate handler file discovery without touching the filesystem.

Test cases to cover:

- **Environment generation**: Given two handler files, the config hook returns two environments with correct `build.outDir`, `rollupOptions.input`, and `rollupOptions.output.entryFileNames`.
- **Shims enabled (default)**: The `rollupOptions.output.banner` contains the `__dirname`/`__filename` shim.
- **Shims disabled**: With `shims: false`, the banner is omitted (empty or absent).
- **Concurrency**: With `concurrency: 1`, `buildApp` calls `builder.build()` sequentially (one at a time) rather than all in parallel.
- **Module types**: With `moduleTypes: { '.graphql': 'text' }`, the value appears in each environment's `rollupOptions.moduleTypes`.
- **Vitest skip**: When `VITEST` env var is `'true'`, the config hook returns no environments and no builder.
- **Path traversal**: Passing a handler path containing `..` throws an error.
- **Strip-unneeded-plugins**: The returned config includes the `strip-unneeded-plugins` plugin.

## Acceptance criteria

- [ ] All test cases listed above pass
- [ ] `globSync` is mocked — tests do not depend on real filesystem handler files
- [ ] `VITEST` env var test uses vitest's `env` config or properly restores the env var
- [ ] `yarn test` passes from the repo root with the new tests included

## Blocked by

- 02 — Core plugin
