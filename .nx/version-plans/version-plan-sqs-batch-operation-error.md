---
aws-wrappers: minor
---

MI-331: **Behaviour change** — `SQSService.sendMessageBatch` and `SQSService.deleteMessageBatch` now throw a `BatchOperationError` when SQS rejects any entry.

Previously both methods resolved with the raw per-chunk output even when entries came back under `Failed`, so a handler could acknowledge work that was never queued, or assume messages were deleted when they would be redelivered. Every chunk is still sent; the error is thrown afterwards and carries the per-chunk `results` and a normalised `failed` list of `{ id, code, message }` (never any payload). A call where no entry fails returns exactly what it did before, and request-level SDK exceptions still propagate unchanged.

Callers of these two methods should audit their call sites: code that relied on a resolved promise meaning "everything was accepted" will now see a thrown error, and should catch `BatchOperationError` to retry or report the failed entries. `BatchOperationError` is exported from the package entry point and sets a stable `name` of `'BatchOperationError'`.
