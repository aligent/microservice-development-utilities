---
nx-cdk: patch
---

Fix the generated workspace pre-commit hook so it works on macOS. BSD `paste` requires an explicit stdin operand, so the hook silently skipped lint, type-check and tests on macOS.

Existing workspaces need the same edit applied by hand: in `.git-hooks/pre-commit`, change `paste -sd,` to `paste -sd, -`.
