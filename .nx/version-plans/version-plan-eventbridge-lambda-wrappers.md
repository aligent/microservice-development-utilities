---
aws-wrappers: minor
---

MI-331: Add `EventBridgeService` and `LambdaService`, plus a new `LambdaFunctionError`.

`EventBridgeService.putEvents` takes the SDK input unchanged, sends entries in chunks of ten, and after every chunk has been sent throws a `BatchOperationError` if EventBridge rejected any entry. Each failed entry's `id` is its index in the `Entries` list you passed in, as a string. The error carries the per-chunk `results` and the failed entries' `id`, `code` and `message` — never the event detail. Request-level SDK failures propagate unwrapped and nothing is retried.

`LambdaService.invoke` takes the SDK input unchanged and returns the SDK output unchanged, except that it throws `LambdaFunctionError` when the response carries a `FunctionError`. The error carries the function name, the function error value, and the error type and message parsed from the payload when it has the usual JSON shape; it never carries the raw response or stack trace. Async and dry-run invocations are unaffected.

Both wrappers log one INFO line per call with payload-carrying fields omitted (event detail and entries; invocation payload and client context), are X-Ray instrumented by default, and accept an injected client and logger. `LambdaFunctionError` has a fixed `name`, so match on `error.name` rather than `instanceof` when both the CJS and ESM builds may be loaded.
