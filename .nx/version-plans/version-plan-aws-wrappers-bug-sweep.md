---
aws-wrappers: minor
---

MI-331: Fix a set of correctness bugs in `@aligent/aws-wrappers`, two of which change what consumers see.

Consumer-visible changes:

- **Node 20 or later is now required.** `engines.node` was `>=18`, but the pinned `@aws-sdk/*` clients already require `>=20`, so Node 18 installs were never supported in practice. The build target stays ES2022.
- **`DynamoDBService.batchGet` and `batchWrite` now throw a `BatchOperationError`** instead of a plain `Error` (`batchGet failed after 5 attempts`) when items remain unprocessed after the final attempt. Callers that matched the old message must match on the error `name`. `results` holds the last response, which carries the pending `UnprocessedKeys` / `UnprocessedItems`, and for `batchGet` the `Responses` retrieved so far, so nothing is lost. `failed` has one entry per pending key or item with `id` set to `<table>[<index>]`; keys and items never appear in `failed` or the message. The `Retrying unprocessed DynamoDB items` warning is no longer logged on the final attempt, when no retry follows.
- `SSMService.getParameters` now resolves aliases given as a parameter ARN or a `name:version` / `name:label` selector. Previously SSM's response, which names the parameter by its plain name, never matched the requested string, so those aliases silently resolved to `undefined` and `required: true` did not catch it.
- `SecretsManagerService.getJsonSecret`, `S3Service.getJsonObject` and `S3Service.getAllObjects` no longer leak content into errors. A malformed body used to surface the native `SyntaxError`, whose message quotes a snippet of the input; it now throws an error naming the secret or object (`s3://bucket/key`) and carrying none of the content.
- Truncation limits were stale. `SNSService` now truncates `Subject` to 99 characters (SNS requires fewer than 100, so the previous 100 was still rejected), and `SQSService` now truncates `MessageBody` at 1 MiB, the current SQS maximum, instead of 256 KiB. The SNS `Message` cut-off stays at 256 KiB, the default topic limit; the docs now say it does not follow a raised topic `MaximumMessageSize`, and that truncating JSON can leave it invalid.
- `BatchOperationError` messages use correct pluralisation and drop the empty `()` when no entry carries a code (`Batch operation failed for 1 entry`).
