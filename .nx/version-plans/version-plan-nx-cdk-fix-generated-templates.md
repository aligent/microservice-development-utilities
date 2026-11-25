---
nx-cdk: patch
---

Fix the preset templates so a freshly generated workspace passes `cdk synth`, lint and type-checking.

Existing workspaces need the same edits applied by hand:

- `application/bin/main.ts`: pass the stage name with `new MicroserviceChecks({ stageName })` (synth throws without it), import `AspectOptions` and `IAspect` with the `type` modifier, and declare `let duration: 'SHORT' | 'MEDIUM' | 'LONG';` without an initialiser.
- `application/lib/service-stacks.ts`: build the stage `env` with `...(process.env.CDK_DEFAULT_ACCOUNT && { account: process.env.CDK_DEFAULT_ACCOUNT })` so an unset account is omitted under `exactOptionalPropertyTypes`.
- `libs/infra/tsconfig.json`: remove the `baseUrl` option, which TypeScript 6 rejects.
- `README.md`: list `vite.config.base.mjs` in the project structure instead of `rolldown.config.base.mjs` and `vitest.config.base.mjs`.
