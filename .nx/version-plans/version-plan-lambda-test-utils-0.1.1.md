---
lambda-test-utils: patch
---

MI-338: Fix `0.1.0` publish, which shipped without `cjs`/`esm` build output because it was published manually from the package source root instead of `dist`. No code changes — republishing from a clean CI build.
