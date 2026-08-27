---
aws-wrappers: patch
---

MI-331: `SSMService.getParameters` now auto-chunks the requested SSM parameter names into groups of 10 — the AWS SSM `GetParameters` per-request cap — sending one `GetParametersCommand` per chunk and merging the results before building the alias-keyed return value.

Previously a caller supplying 11 or more aliases got a runtime `ValidationException` from AWS, even though every individual name was valid. This closes the gap for the one remaining capped operation in the package that wasn't already auto-chunked (`S3.deleteObjects`, `SQS.sendMessageBatch`/`deleteMessageBatch`, and `SNS.publishBatch` already handle their SDK caps transparently).

Public signature, return shape, and single-chunk (≤10 aliases) behaviour are unchanged.

MI-331: `DynamoDBService.batchGet` now retries non-empty `UnprocessedKeys` with jittered exponential backoff (up to 5 attempts, 200ms base delay), merging `Responses` across attempts and throwing if keys remain unprocessed after the final attempt.

Previously a caller doing `const { Responses } = await ddb.batchGet(...)` could silently receive an incomplete result set under provisioned-throughput contention or per-request limits, with no signal anything was missing. This mirrors `batchWrite`'s existing `UnprocessedItems` retry handling, which is now the shared reference pattern for both methods (the `backoffDelay` helper is generalised to take a per-method base delay).

Public signature, return shape, and behaviour for calls with no unprocessed keys are unchanged.
