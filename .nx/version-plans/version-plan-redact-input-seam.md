---
aws-wrappers: patch
---

MI-331: Route every log-redaction decision through a single internal `redactInput` entry point.

The internal redaction helper now accepts either a field allowlist or a projection function, so the computed batch summaries (`entryCount`, `keyCount`, `tables`) and the Scheduler's `Target.Input` strip share the same level check as the field allowlists. The level predicate is private to `redact.ts`. Log output is unchanged at every level and there is no public API change.
