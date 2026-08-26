---
aws-wrappers: patch
---

MI-331: `SSMService.getParameters` now auto-chunks the requested SSM parameter names into groups of 10 — the AWS SSM `GetParameters` per-request cap — sending one `GetParametersCommand` per chunk and merging the results before building the alias-keyed return value.

Previously a caller supplying 11 or more aliases got a runtime `ValidationException` from AWS, even though every individual name was valid. This closes the gap for the one remaining capped operation in the package that wasn't already auto-chunked (`S3.deleteObjects`, `SQS.sendMessageBatch`/`deleteMessageBatch`, and `SNS.publishBatch` already handle their SDK caps transparently).

Public signature, return shape, and single-chunk (≤10 aliases) behaviour are unchanged.
