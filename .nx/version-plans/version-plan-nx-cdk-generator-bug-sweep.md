---
nx-cdk: patch
---

Fix several generator bugs.

- The service generator now requires lowercase kebab-case names starting with a letter, so the derived stack class name and constant are valid TypeScript identifiers. Names such as `2fa`, `-a`, `a--b` and `a-` were previously accepted and produced a service that did not compile. The remove-service generator still accepts any path-safe name (lowercase alphanumeric characters and dashes), so services created under such names can still be removed.
- The service and remove-service generators log a warning through the Nx logger when `application/lib/service-stacks.ts` is missing, and the remove-service generator also warns when `ApplicationStage` cannot be found in it. The service generator throws an error naming the file when `ApplicationStage` cannot be found.
- The remove-service generator no longer touches the root `package.json` `workspaces`, which a generated workspace lists as globs.
- Generated service tsconfigs no longer list a `vitest.config.mjs` that is never generated.
- Generated workspaces now pin `nx` and the `@nx/*` packages to 23.2.0, the Nx major the plugin's own `@nx/devkit` runs on, instead of 22.7.3. Previously a generated workspace resolved two `@nx/devkit` majors. A spec keeps the two in step.

Existing workspaces need the following edits applied by hand:

- `.git-hooks/pre-commit`: remove the comma between the two entries of the `commands=(...)` array. The first command otherwise ran with `--parallel=3,`.
- `package.json`: move `nx`, `@nx/eslint`, `@nx/eslint-plugin`, `@nx/js`, `@nx/vite` and `@nx/workspace` from 22.7.3 to 23.2.0, then run `yarn install`.
