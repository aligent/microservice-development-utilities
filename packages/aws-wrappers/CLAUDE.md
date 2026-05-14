# CLAUDE.md — @aligent/aws-wrappers

Guidance for Claude Code when working in this package. Read alongside the repo-root `CLAUDE.md`.

## Purpose

Each `*Service` class wraps a single AWS SDK client. The wrapper bundles:

- a Powertools `Logger` (one `logger.info` line at the start of every public method),
- X-Ray tracing via `captureAWSv3Client`,
- ergonomic helpers that smooth over recurring SDK quirks (auto-pagination, auto-chunking, JSON helpers, retry-on-`UnprocessedItems`, etc.).

Callers who need raw SDK access drop down to the SDK client directly — the wrappers do not try to be a full SDK replacement.

## Layout

```
packages/aws-wrappers/src/
├── <service>/
│   ├── <service>.ts        # the *Service class
│   └── <service>.test.ts   # co-located tests
└── index.ts                # named exports of every *Service class
```

One folder per service, lowercase. No barrel files inside service folders — `index.ts` imports the class directly from `<service>/<service>`.

## Locked-in conventions

These are non-negotiable across every service in the package — change them only with explicit user sign-off.

### Constructor

```ts
constructor(opts?: { logger?: Logger; client?: <ServiceClient> })
```

- `logger` defaults to `new Logger()`, which picks up `POWERTOOLS_SERVICE_NAME` from the environment. Do **not** pass `serviceName` in the default — env-driven service naming is the Powertools convention.
- `client` defaults to `captureAWSv3Client(new <ServiceClient>())`. When the caller supplies a client, the wrapper does **not** apply X-Ray instrumentation — that's the caller's call.
- No `clientConfig` / `region` / `endpoint` options. Callers needing those construct their own client and pass it via `client`.

### Logging

Every public method emits exactly one `logger.info('<verb> <noun>', { input })` line at the start.

- Uniform `{ input }` shape so log lines are predictable to grep and to scrub.
- Two documented exceptions, both for the same reason (avoid logging sensitive/large payloads):
  - `S3.putObject` / `S3.putJsonObject` log `{ input: { Bucket, Key } }`, omitting `Body`.
  - Batch methods that chunk (`S3.deleteObjects`, `SQS.sendMessageBatch` / `deleteMessageBatch`, `SNS.publishBatch`) log `{ input: { Bucket/QueueUrl/TopicArn, keyCount/entryCount } }`, omitting the full array.

If you find yourself wanting a third exception, raise it with the user first — the goal is predictability.

### Patterns

- **Auto-pagination, flat array**: `S3.listObjects` / `getAllObjects` / `emptyBucket`, `SSM.getParametersByPath`, `SFN.listExecutions`. Used when the result set is bounded in practice.
- **Generator pagination, yield items**: `DynamoDB.paginateItems` / `paginateScan`. Used when the result set is potentially unbounded — peak memory stays bounded by one page.
- **Auto-chunking**: `S3.deleteObjects` / `emptyBucket` (1000), `SQS.sendMessageBatch` / `deleteMessageBatch` (10), `SNS.publishBatch` (10). Mirrors the SDK-enforced per-request cap so callers don't have to.

### DynamoDB specifics

- Backed by `DynamoDBDocumentClient`. Always wrap the base `DynamoDBClient` with `captureAWSv3Client` **before** passing it to `DynamoDBDocumentClient.from(...)`, so X-Ray captures every command.
- `marshallOptions: { removeUndefinedValues: true }`.
- All commands and paginators come from `@aws-sdk/lib-dynamodb`. Never import marshaling helpers from `@aws-sdk/util-dynamodb` — that's what the doc client is for.
- Generic typing convention:
  - Methods that return a single item or yield items (`getItem`, `paginateItems`, `paginateScan`): `Promise<T | undefined>` / `AsyncGenerator<T>`.
  - Methods that return the full command output (`query`, `scan`, `updateItem`, `deleteItem`): preserve the output and generically type only the data-bearing field (`Items?: T[]`, `Attributes?: T`).
  - `batchGet` is intentionally **not** generic — multi-table `Responses` can't be soundly described by a single `T`. Document this in TSDoc whenever the method is touched.
  - All generics default to `T extends Record<string, unknown> = Record<string, unknown>` so callers can omit them.

## Adding a new service

Walk through these in order. Each step is small; nothing is automatable enough to be worth a generator.

1. **Confirm scope with the user.** Run the questions in the next section before writing code. Don't infer the answers from the SDK.
2. **Install the SDK client** as a runtime dependency of the package:
   ```sh
   npm install --workspace=@aligent/aws-wrappers @aws-sdk/client-<service>
   ```
   Never hand-edit `package.json`. ESLint's `@nx/dependency-checks` rule will flag unused deps via `--fix` if you install too early — install per-service as you implement.
3. **Create the folder**: `packages/aws-wrappers/src/<service>/`, with `<service>.ts` and `<service>.test.ts`.
4. **Implement the class** following the locked-in conventions above. Mirror the structure of an existing service of similar shape — `SecretsManagerService` is the simplest skeleton; `DynamoDBService` is the most complex.
5. **Add tests with `aws-sdk-client-mock`**. Default-construction test (`expect(() => new XService()).not.toThrow()`) plus targeted coverage on non-trivial methods. For any method that uses an SDK paginator (`paginate*`), pass a real client instance via the constructor — see "Testing notes" below.
6. **Add a named export to `src/index.ts`** in alphabetical order.
7. **Run** `npx nx run aws-wrappers:lint --fix`, `:typecheck`, `:test --coverage`, `:typedoc`. The 80% workspace coverage threshold is enforced.
8. **Update the package `README.md`** with a worked example under a new `## <Service Name>` section.
9. **Commit** with the active ticket prefix.
10. **Ask the user whether to run the `code-reviewer` sub-agent** over the change before opening the PR. The reviewer catches drift from the locked-in conventions (logging shape, generics, pagination/chunking patterns) and the kinds of defensive-coverage gaps the workspace gate doesn't enforce. Surface its punch list to the user — don't auto-apply fixes.

## Questions to ask the user

### When adding a new service

Don't write code until each of these is answered. Defaults in **bold**.

- **Method coverage**: which SDK operations should the wrapper expose? Default: only the ones with concrete near-term callers — every method is API surface area to maintain.
- **Pagination**: for each `List*` / `Get*ByPath` / etc. operation:
  - Auto-paginate and return a flat array? (**default** when result set is bounded by filters / retention)
  - Expose as an `AsyncGenerator` that yields items? (**default** when result set is potentially unbounded)
  - Pass-through, leave pagination to caller? (only when the caller usually wants pagination metadata)
- **Chunking**: any operation with a per-request entry/key cap (e.g. SNS `PublishBatch` at 10) — auto-chunk to the cap (**default**) or pass-through?
- **Generic typing**:
  - For methods that return a single data-bearing item — return generic `T | undefined` (**default**).
  - For methods that return command output with metadata — preserve the output, generic on the data-bearing field (`Items?: T[]`, `Attributes?: T`).
  - For multi-shape responses (cf. DynamoDB `batchGet`) — **not generic**, document why in TSDoc.
  - Default the generic to `T extends Record<string, unknown> = Record<string, unknown>` so callers can omit it.
- **Logging shape**: does the input contain anything sensitive (credentials, large payloads, message bodies)? If yes, follow the documented exception pattern (`{ Bucket, Key }`, `{ entryCount, ... }`). Default to `{ input }`.
- **Error semantics**: any operations where the wrapper should retry, swallow, or surface differently than the SDK? Capture the rationale in TSDoc. Examples already in this package: `batchWrite` (retry `UnprocessedItems`), `getSecret` (throw on missing `SecretString`).
- **Input shape**: pass-through SDK input (**default**) or a tight `Required<Pick<...>>` projection (the S3 pattern)? Tight shape is appropriate when the SDK has many rarely-used optional fields and exposing them noises up TS errors.
- **Defaults bakedin**: e.g. `SSM` bakes in `WithDecryption: true` with no opt-out. Capture every such "no opt-out" decision in the class-level TSDoc.

### When changing an existing service

- Is this change additive (new method) or modifying an existing public method?
- If modifying: is the package already published? If yes, this is a SemVer-major change — flag it before implementing.
- Does it touch any of the locked-in conventions above? If yes, surface to the user first.
- Will any of the existing tests need to change? If yes, that's a load-bearing signal — verify whether the existing test behaviour was load-bearing for a downstream caller.

Once the change is in and tests pass, ask the user whether to run the `code-reviewer` sub-agent over the diff before opening the PR — same rationale as step 10 of the new-service flow.

## Testing notes

- `aws-sdk-client-mock` patches the prototype `send` method of all instances of the SDK client class. The mock object itself is **not** a usable client — for paginators it fails `instanceof` checks. **For any method that uses an SDK paginator, pass a real client instance via the constructor:**

  ```ts
  const mock = mockClient(SSMClient);          // global intercept
  const service = new SSMService({ client: new SSMClient({}) });  // real instance
  ```

  The mock still intercepts every `.send` call. The bare cast `mock as unknown as SSMClient` works for non-paginator methods but is brittle — prefer the real-instance pattern uniformly.

- Error assertions: `await expect(fn()).rejects.toThrow(...)`. Do **not** use the `try / catch + // eslint-disable-next-line no-empty` pattern that exists in older `microservice-util-lib` tests.

- Coverage gate is 80% workspace-global on lines / branches / functions / statements. For thin pass-through methods, a one-shot "verify the SDK command was sent" test is enough — these are visually verifiable but still need to keep the gate green.

## Out of scope

These came up during the initial design and were explicitly deferred:

- Moving the existing AWS utilities (`S3Dao`, `fetchSsmParams`, `get-aws-id-from-arn`) out of `microservice-util-lib` into this package.
- Deprecating those existing utilities or adding `@deprecated` tags.
- Migration guide from the legacy utilities to the new wrappers.
- Integration tests against LocalStack or real AWS.
- CDK constructs in `nx-cdk` corresponding to these wrappers.
- Wrappers for additional AWS services (EventBridge, Kinesis, etc.) — add them as separate tickets following the "Adding a new service" flow.
