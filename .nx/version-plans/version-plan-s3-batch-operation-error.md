---
aws-wrappers: minor
---

MI-331: **Behaviour change** — `S3Service.deleteObjects` and `S3Service.emptyBucket` now throw a `BatchOperationError` when S3 fails to delete any key.

Previously both resolved even when keys came back under `Errors`, and `emptyBucket` returned every listed key as deleted. Every chunk (and, for `emptyBucket`, every page) is still sent; the error is thrown afterwards and carries the per-chunk `results` and a normalised `failed` list of `{ id, code, message }`, where `id` is the object key. `emptyBucket` now sends its deletes in `Quiet` mode, so its error `results` hold only the failures. A call where no key fails returns exactly what it did before, and request-level SDK exceptions still propagate unchanged.

Callers of `deleteObjects` and `emptyBucket` should audit their call sites and catch `BatchOperationError` to retry or report the failed keys.
