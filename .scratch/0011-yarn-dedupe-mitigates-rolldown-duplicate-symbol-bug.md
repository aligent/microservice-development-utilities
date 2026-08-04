# A full yarn dedupe mitigates rolldown's duplicate-symbol codegen bug

## Status

accepted

## Context

Lambda handlers are bundled with vite 8 (rolldown). A deployed `products` handler
(`GetAttributeOptions`) crashed at module load on staging with:

```
ReferenceError: bindRetryMiddleware$7 is not defined
    at file:///var/task/index.mjs:2557:2
    at file:///var/task/index.mjs:30:23   (repeated)
```

Root cause is a rolldown symbol-deduplication codegen bug. `@smithy/core` (pulled
transitively through `@aligent/aws-wrappers`) resolved to two versions with many nested
copies, so the bundle contained eight copies of its retry module. Rolldown suffixes the
colliding exports `bindRetryMiddleware`, `$1` ... `$7` and, at that copy count, emits the
call site for the eighth copy (`bindRetryMiddleware$7(isStreamingPayload$7)` at
`index.mjs:2557`, the top frame of the trace) but never emits its function definition. The
repeated `index.mjs:30:23` frames are rolldown's `__esmMin` lazy-init helper rethrowing as
module init unwinds.

Findings from reproduction:

- Deterministic. It reproduces with serial builds (`concurrency = 1`), so it is not caused
  by the concurrent shared-builder build. It is also unaffected by top-level await in the
  handler.
- Only surfaces on `stg` / `dev`. Those build with `BUNDLE_MODE=development` (unminified),
  so the original `$N` name survives; the `prd` minified build renames symbols and did not
  crash in testing.
- Only reproduces from a clean `yarn install --immutable`. A locally deduped or polluted
  `node_modules` hides it.

This is the same bug family as the `node_http2 is not defined` shim already documented in
`vite.config.base.mjs`.

## Decision

Run a full `yarn dedupe` and commit the resulting `yarn.lock`. Deduping collapses the
duplicate copies below the count that trips the codegen bug. After it, every `products`
handler bundle initialises cleanly, and the change is low risk: it only removes duplicate
resolutions and introduces no new package versions (no upgrades), and
`yarn install --immutable` still passes.

A targeted, single-package dedupe (`yarn dedupe '@smithy/core'`) is explicitly rejected: it
collapses that package to one copy but only relocates the same crash to the next duplicated
module (observed as `node_http2$1 is not defined`).

## Consequences

- The fix is invisible in application source; it lives entirely in `yarn.lock`. A pointer
  comment in `vite.config.base.mjs` (beside the sibling `node_http2` shim) references this
  ADR so the dedupe is not undone by accident.
- This is a threshold mitigation, not a permanent fix. A future dependency bump can push
  duplicate copies back toward the trigger count and resurface the crash under a new
  `$N` symbol. Residual `$1`/`$2` copies already remain post-dedupe.
- The durable fix is deferred: either upgrade rolldown / vite past the dedup codegen bug,
  or pin `@smithy/*` to single versions via package `resolutions`. When either lands, the
  standing `yarn dedupe` requirement and this ADR can be revisited.
- Recognition aid for the next occurrence: any `<symbol>$N is not defined` at Lambda load,
  with a trace dominated by `index.mjs:30:23` frames, is this bug. Reproduce from a clean
  `yarn install --immutable`, then `yarn dedupe`.
