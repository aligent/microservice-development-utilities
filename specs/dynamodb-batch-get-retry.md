# Spec: Retry `UnprocessedKeys` in `DynamoDBService.batchGet`

**Ticket**: TBD
**Status**: done
**Branch**: `fix/dynamodb_batch_get_unprocessed_keys`
**Release**: patch on `@aligent/aws-wrappers`
**Commit prefix**: `fix: <message>`

## Problem Statement

`DynamoDBService.batchGet` sends a single `BatchGetCommand` and returns the raw response. DynamoDB's `BatchGetItem` API can return an HTTP 200 with a non-empty `UnprocessedKeys` field — this happens routinely under provisioned-throughput contention, or when a single request's item-count or response-size limits are exceeded — meaning some of the requested keys received no response at all, silently.

The wrapper does not check for this, retry it, or even log a warning. A caller doing `const { Responses } = await ddb.batchGet(...)` and iterating `Responses[table]` gets an incomplete result set with no signal that anything is missing. This is worse than a thrown error: it can pass code review and every test written against a happy-path mock, then intermittently drop records in production under real load.

The sibling method `batchWrite`, one method below `batchGet` in the same file, already handles the equivalent write-side condition correctly: it retries `UnprocessedItems` with jittered exponential backoff for up to 5 attempts and throws if items remain unprocessed after the final attempt. `batchGet` has no equivalent handling, which is an inconsistency within the same class rather than a hypothetical edge case — the package's own "Adding a new service" checklist names `batchWrite`'s `UnprocessedItems` retry as the reference example for this exact category of error-semantics decision.

## Solution

`batchGet` retries automatically when DynamoDB returns non-empty `UnprocessedKeys`, re-requesting only the unprocessed keys with jittered exponential backoff between attempts, merging `Responses` across attempts, and throwing if keys remain unprocessed after the final attempt. The public method signature and return type are unchanged; a caller who never hits this condition sees no difference.

## User Stories

1. As a microservice developer, I want `batchGet` to automatically retry keys DynamoDB didn't process, so that a transient throughput blip doesn't silently drop records from my result.
2. As a microservice developer, I want the merged `Responses` from a retried call to look identical in shape to a single successful `BatchGetItem` response, so that my calling code doesn't need to know retries happened.
3. As a microservice developer, I want `batchGet` to throw a clear error if keys are still unprocessed after all retry attempts, so that I find out my data is incomplete instead of silently proceeding with a partial result.
4. As a microservice developer, I want the retry behaviour for `batchGet` to match `batchWrite`'s existing retry behaviour (backoff shape, attempt count, warn-on-retry logging), so that I only have to learn one retry pattern for this package's DynamoDB batch methods.
5. As a microservice developer, I want the existing INFO log line and its redaction behaviour (table names only outside verbose log levels) to be unaffected by the retry logic, so that adding retries doesn't change what gets logged about my request.
6. As a maintainer of `@aligent/aws-wrappers`, I want `batchGet`'s retry loop to reuse the same backoff helper `batchWrite` already uses, so that the two methods can't drift into two different backoff curves over time.
7. As a maintainer, I want the retry attempt count and base delay to be named constants near the top of the file (mirroring `BATCH_WRITE_MAX_ATTEMPTS` / `BATCH_WRITE_BASE_DELAY_MS`), so the tuning is visible and consistent with the existing convention.
8. As a maintainer, I want a `logger.warn` line on each retry attempt (mirroring `batchWrite`'s "Retrying unprocessed DynamoDB items"), so that retries are observable in production logs rather than silent.
9. As a maintainer, I want the package's `CLAUDE.md` DynamoDB-specifics section updated to record that `batchGet` now retries `UnprocessedKeys`, so the documented rationale for `batchGet` staying non-generic doesn't read as though the method has no other special-cased behaviour.
10. As a maintainer, I want a test that forces a non-empty `UnprocessedKeys` response and asserts a second `BatchGetCommand` is sent with only the unprocessed keys, so a future refactor can't silently drop the retry behaviour without a test failing.
11. As a maintainer, I want a test asserting `batchGet` throws after the max attempt count when keys are still unprocessed, so the failure-after-retries path (mirroring `batchWrite`'s equivalent) is locked in.

## Implementation Decisions

- **Trigger condition**: retry when `response.UnprocessedKeys` is present and `Object.keys(response.UnprocessedKeys).length > 0` — same emptiness check `batchWrite` already uses for `UnprocessedItems`.
- **Retry shape**: a `for` loop up to a fixed max-attempts constant, re-sending `new BatchGetCommand({ ...input, RequestItems: unprocessed })` on each retry, with a jittered exponential backoff sleep between attempts (not after the last). This is a direct structural mirror of the existing `batchWrite` loop (`dynamodb.ts:334-356`).
- **Constants**: introduce `BATCH_GET_MAX_ATTEMPTS` and `BATCH_GET_BASE_DELAY_MS`, matching `BATCH_WRITE_MAX_ATTEMPTS` (5) and `BATCH_WRITE_BASE_DELAY_MS` (200ms) in value, rather than hard-defaulting to shared write-side constants — the two methods' retry budgets are independent tuning knobs even though they start at the same numbers today. The existing `backoffDelay(attempt)` helper is generalised to accept a base-delay parameter (defaulting to none required at each call site: `backoffDelay(attempt, BATCH_GET_BASE_DELAY_MS)` / `backoffDelay(attempt, BATCH_WRITE_BASE_DELAY_MS)`) so both methods share one implementation rather than duplicating the exponential-jitter formula.
- **Result merging**: unlike `batchWrite` (which only needs to know whether unprocessed items remain, not merge a payload), `batchGet` must accumulate `Responses` across attempts, since each retry only returns data for the keys it was asked for. The method merges each attempt's `response.Responses` into an accumulator, keyed by table name, concatenating item arrays per table across attempts, before returning the final merged `BatchGetCommandOutput`-shaped object.
- **Return value on success**: the merged object exposes `Responses` combining all attempts. Other top-level fields (e.g. `ConsumedCapacity`) are taken from the final attempt's response, matching how `batchWrite`'s returned response is simply whichever attempt's response had empty `UnprocessedItems` (no cross-attempt merging of non-Responses fields is needed for `batchWrite`, but `batchGet` needs at least the `Responses` merge since that's the field callers actually consume).
- **Failure mode**: throw `new Error(`batchGet failed after ${BATCH_GET_MAX_ATTEMPTS} attempts`)` after the final attempt if `UnprocessedKeys` is still non-empty — same message shape and throw-not-return-partial decision as `batchWrite`.
- **Logging**: the existing single `logger.info('Batch getting DynamoDB items', ...)` line at the top of the method is unchanged. A new `logger.warn('Retrying unprocessed DynamoDB items', { attempt, tables: Object.keys(unprocessed) })` line is added inside the retry loop, reusing the exact message `batchWrite` already emits for its own retry warning (both are the same underlying condition — unprocessed keys/items on a batch DynamoDB operation — so one shared, recognisable log message across both methods is more useful to an operator than two differently worded lines for the same failure mode).
- **Generics**: `batchGet` remains intentionally non-generic, per its existing TSDoc rationale (`Responses` is a multi-table record whose item shapes can differ per table). The retry logic doesn't change this — it operates on the raw command input/output shape, not on unmarshalled typed items.
- **No new options**: retry attempt count and backoff are not exposed as caller-configurable options, matching `batchWrite`'s existing fixed-constant approach.

## Testing Decisions

A good test here exercises `batchGet` from the outside — request in, merged response out, or a thrown error — with the SDK mocked at the `send` boundary. Nothing should assert on the backoff timing itself beyond confirming a retry happened; real `setTimeout` delays should be avoided in the test (fake timers or a mocked/short backoff, matching however the existing `batchWrite` retry test already handles this — check `dynamodb.test.ts` for the established approach before writing a new one).

**Module under test**: `DynamoDBService.batchGet`, in `dynamodb.test.ts`.

**Prior art**: the existing `batchWrite` retry tests in `dynamodb.test.ts`, which already cover the equivalent `UnprocessedItems` retry-then-succeed and retry-until-throw cases for the sibling method — same shape, applied here for `UnprocessedKeys`.

**Coverage**:

- No `UnprocessedKeys` in the response: unchanged behaviour, single `BatchGetCommand` call, response returned as-is (regression guard for the existing happy path).
- Non-empty `UnprocessedKeys` on the first attempt, empty on the second: asserts a second `BatchGetCommand` is sent with `RequestItems` set to only the unprocessed keys, and that the final `Responses` contains items from both attempts merged per table.
- `UnprocessedKeys` still non-empty after `BATCH_GET_MAX_ATTEMPTS` attempts: asserts the method throws, and that exactly `BATCH_GET_MAX_ATTEMPTS` `BatchGetCommand` calls were made.
- A retry emits the `logger.warn` line with the retried table names.
- The existing INFO-level redaction test (table names only, not full input, outside verbose levels) still passes unchanged.

**Coverage gate**: the workspace-global 80% threshold on lines, branches, functions, and statements applies as usual.

## Out of Scope

- Making retry attempt count or backoff configurable per call or per instance — matches `batchWrite`'s existing fixed-constant approach; can be revisited for both methods together if a real need arises.
- Unmarshalling or generically typing `batchGet`'s result — out of scope per the method's existing, unchanged TSDoc rationale for staying non-generic.
- Retrying `batchWrite`'s constants/behaviour itself — this spec only touches `batchGet`; `batchWrite`'s only change is the `backoffDelay` helper's signature gaining a base-delay parameter, with its existing call site updated to pass `BATCH_WRITE_BASE_DELAY_MS` explicitly.
- Circuit-breaking or capping total retry wall-clock time across a batch of `batchGet` calls at a higher level (e.g. across a Lambda invocation) — this is a single-call retry, not an application-level concern.

## Further Notes

This closes a real silent-partial-read failure mode using a pattern the file already implements correctly one method away — no new public API, no behavioural change for the common case (no unprocessed keys), and the one shared piece of refactoring (generalising `backoffDelay` to take a base delay) is small and keeps `batchWrite`'s own behaviour byte-for-byte identical.
