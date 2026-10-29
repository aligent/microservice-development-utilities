---
aws-wrappers: minor
---

MI-331: **Behaviour change** — `S3Service.deleteObjects` and `S3Service.emptyBucket` now throw a `BatchOperationError` when S3 reports per-key delete errors.

Previously `deleteObjects` resolved with the raw per-chunk output even when keys came back under `Errors`, and `emptyBucket` returned every key it had *issued* a delete for, so a handler could assume objects were gone when they were not. `deleteObjects` still attempts every chunk before throwing; the error carries the per-chunk `results` and a normalised `failed` list of `{ id, code, message }`, where `id` is the object key. `emptyBucket` now returns only the keys that were actually deleted, continues through every page when one has failures, and throws a single aggregated error at the end whose `results` hold the deleted keys per page (`{ deletedKeys }`). A call where no key fails returns exactly what it did before, and request-level SDK exceptions still propagate unchanged.

Callers of these two methods should audit their call sites: code that relied on a resolved promise meaning "everything was deleted" will now see a thrown error, and should catch `BatchOperationError` to retry or report the failed keys.
