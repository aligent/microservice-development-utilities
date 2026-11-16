---
aws-wrappers: patch
---

MI-331: Share one `batchFailure` test helper across the SQS, SNS and EventBridge specs instead of redefining it in each.

The helper lives in `src/util/batch-operation-error.test-helpers.ts`, which is excluded from the library build, so nothing new ships. There is no public API change.
