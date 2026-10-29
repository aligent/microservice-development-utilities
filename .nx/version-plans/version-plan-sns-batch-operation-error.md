---
aws-wrappers: minor
---

MI-331: **Behaviour change** — `SNSService.publishBatch` now throws a `BatchOperationError` when SNS rejects any entry.

Previously the method resolved with the raw per-chunk output even when entries came back under `Failed`, so a handler could assume notifications were published when they were not. Every chunk is still sent; the error is thrown afterwards and carries the per-chunk `results` and a normalised `failed` list of `{ id, code, message }` (never any message body, subject or attributes). A call where no entry fails returns exactly what it did before, and request-level SDK exceptions still propagate unchanged.

Callers of `publishBatch` should audit their call sites: code that relied on a resolved promise meaning "everything was published" will now see a thrown error, and should catch `BatchOperationError` to retry or report the failed entries.

Every log-redaction decision now goes through a single internal `redactInput` entry point. The internal redaction helper now accepts either a field allowlist or a projection function, so the computed batch summaries (`entryCount`, `keyCount`, `tables`) and the Scheduler's `Target.Input` strip share the same level check as the field allowlists. The level predicate is private to `redact.ts`. Log output is unchanged at every level and there is no public API change.
