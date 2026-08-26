---
aws-wrappers: patch
---

`DynamoDBService.batchGet` now retries non-empty `UnprocessedKeys` with jittered exponential backoff (up to 5 attempts, 200ms base delay), merging `Responses` across attempts and throwing if keys remain unprocessed after the final attempt.

Previously a caller doing `const { Responses } = await ddb.batchGet(...)` could silently receive an incomplete result set under provisioned-throughput contention or per-request limits, with no signal anything was missing. This mirrors `batchWrite`'s existing `UnprocessedItems` retry handling, which is now the shared reference pattern for both methods (the `backoffDelay` helper is generalised to take a per-method base delay).

Public signature, return shape, and behaviour for calls with no unprocessed keys are unchanged.
