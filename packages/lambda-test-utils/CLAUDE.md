# CLAUDE.md — @aligent/lambda-test-utils

Guidance for Claude Code when working in this package. Read alongside the repo-root `CLAUDE.md`.

## Purpose

API Gateway-attached Lambda handlers tend to get skipped by unit tests because they're treated as integration tests. This package builds a valid `APIGatewayProxyEvent` and Lambda `Context`, invokes the handler under test with them, and hands back a parsed response — so handler authors can assert input/output without standing up a real HTTP layer.

Scope is deliberately narrow: input/output assertions only. Mocking side effects (S3, DynamoDB, etc.) stays the test author's responsibility, outside this harness, and there is no real HTTP-layer emulation (no supertest / local server). See "Out of scope" below.

## Layout

```
packages/lambda-test-utils/src/
├── event.ts          # buildApiGatewayEvent, withJsonBody
├── event.test.ts
├── context.ts         # buildLambdaContext
├── context.test.ts
├── invoke.ts          # invokeApiGatewayHandler, InvokedResponse
├── invoke.test.ts
├── util/
│   ├── deep-merge.ts  # internal-only, not exported from index.ts
│   └── deep-merge.test.ts
└── index.ts           # named exports of the public API
```

One file per exported concept, flat — no service-style subfolders (unlike `aws-wrappers`), since there's a small, fixed set of functions rather than a growing set of per-service wrappers. `util/` holds internal helpers only; nothing in it is re-exported from `index.ts`.

## Build layout

The package is **dual-published** as both CommonJS and ES modules via `@nx/rollup`, following the same pattern as `aws-wrappers` (see `packages/aws-wrappers/CLAUDE.md` under "Build layout" for the full rationale). The short version:

- `rollup.config.mjs` invokes `withNx` twice — once per format — emitting `dist/cjs` and `dist/esm`.
- Unlike `aws-wrappers`, there is **no `./testing` subpath** — this package has a single entry point (`src/index.ts`), since the whole package *is* test scaffolding; there's no split between production code and a test-only helper.
- `package.json` `exports` routes ESM consumers to `dist/esm/` and CJS consumers to `dist/cjs/`, each with its own `.d.ts`.
- `tsconfig.lib.json` / `tsconfig.spec.json` override `module: ESNext` / `moduleResolution: Bundler` / `target: ES2022`, mirroring `aws-wrappers` for the same reasons (rollup is the bundler; ES5 fallback would emit IIFE classes).
- Relative imports in `src/` use the `.js` extension (e.g. `./util/deep-merge.js`) — required for ESM consumer resolution under Node16/NodeNext. Test files omit it, matching the rest of the repo's test-file convention.

This package is published as a **devDependency** for consuming service projects — it never ships in a Lambda bundle, so bundle size for the package itself isn't a driving concern the way it is for `aws-wrappers`' `./testing` subpath. `@types/aws-lambda` is a regular `dependencies` entry (not `devDependencies`) purely so its ambient types (`Context`, `APIGatewayProxyEvent`, `Handler`) resolve transitively for consumers — it contributes no runtime code.

## Locked-in conventions

### Deep-merge overrides, not shallow replace

`buildApiGatewayEvent` and `buildLambdaContext` both deep-merge `overrides` onto their defaults via `util/deep-merge.ts`, rather than a shallow `{ ...defaults, ...overrides }`. This is load-bearing: `APIGatewayProxyEvent.requestContext` and `Context` both nest several required fields (`requestContext.identity.sourceIp`, etc.), and a shallow merge would let a caller silently drop sibling defaults by overriding one nested field. Plain objects recurse; arrays and primitives are replaced outright — an override completely replaces a default array rather than attempting element-wise merging (see `deepMerge`'s TSDoc).

`deepMerge`'s public signature takes `overrides?: DeepPartial<NoInfer<T>>` rather than `Partial<T>`. The `NoInfer` wrapper is required — without it, TypeScript infers the generic `T` from *both* the `base` and `overrides` parameters, and picks up the looser (fully-optional) shape from `overrides`, defeating the return type. Removing it re-introduces a real type hole; don't "simplify" this away.

### `invokeApiGatewayHandler` supports both handler styles

The `Handler` type from `@types/aws-lambda` allows either a returned `Promise` or a NodeJS-style `callback`. `invokeApiGatewayHandler` races both: it always passes a callback, and separately checks whether the handler's return value is promise-like. Real Lambda handlers only ever use one style, so only one path resolves per call — but the implementation doesn't assume which, since dropping the callback path (or the promise path) would silently break handlers written in the other style.

### `json<T>()` throws on non-JSON bodies

`InvokedResponse.json<T>()` wraps `JSON.parse` failures in a new `Error` with a `cause`, per the acceptance criteria for a "clear error on non-JSON bodies" (MI-338). Don't let a `JSON.parse` `SyntaxError` propagate unwrapped — the message doesn't include the offending body, which is the useful part for a failing test.

## Adding a new builder or assertion helper

1. **Confirm it's still input/output-only.** If the ask involves mocking a side effect (S3, DynamoDB, SQS, etc.) or spinning up a real HTTP layer, that's out of scope for this package — raise it with the user rather than growing the harness. See "Out of scope" below.
2. **One file per concept**, following the existing flat layout — don't introduce subfolders unless the package outgrows a handful of files.
3. **Deep-merge, don't shallow-merge**, if the new builder produces a nested object with sensible defaults a caller might want to partially override. Reuse `util/deep-merge.ts` rather than hand-rolling another merge.
4. **Add a named export to `src/index.ts`.**
5. **Add tests** covering the default-construction path and any override behaviour. The workspace coverage gate is 80% global; this package currently sits at 100%, so a new export without tests will fail the gate.
6. **Update the package `README.md`** with a usage example — this package is consumed by other teams writing Lambda tests, so the README is the primary discoverability surface.
7. **Run** `npx nx run lambda-test-utils:lint --fix`, `:typecheck`, `:test --coverage`.

## Testing notes

- No AWS SDK mocking is needed in this package's own tests — it builds plain data (events, contexts) and invokes plain functions. Tests exercise the builders directly and `invokeApiGatewayHandler` against small inline handler functions (both async and callback-style) defined per test.
- Cover both completion paths of `invokeApiGatewayHandler` when touching it: a handler that returns a promise, and one that only uses the callback — plus the callback's error branch (`Error`, string, and "completed without a result") and a thrown rejection from an async handler.

## Out of scope

These were explicitly ruled out when the package was designed (MI-338) and should be raised with the user before being added:

- Mocking side effects — S3, DynamoDB, or any other AWS SDK call a handler under test makes. That's the test author's own responsibility, using whatever mocking approach fits their handler (e.g. `aws-sdk-client-mock`).
- Real HTTP-layer emulation (`supertest`, a local server, or similar) — this package only ever calls the handler function directly.
- Event/context builders for non-API-Gateway trigger types (SQS, EventBridge, S3, etc.) — nothing in this package currently supports them; adding one is a scope change worth raising explicitly, not an obvious extension of the existing builders.
