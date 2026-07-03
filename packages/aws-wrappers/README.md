# @aligent/aws-wrappers

Opinionated AWS SDK wrappers with Powertools logging and X-Ray tracing baked in. Each `*Service` class instantiates and instruments its underlying SDK client by default and emits a structured `logger.info` line on every operation, so consumers get a consistent, observable starting point without rewriting the same boilerplate per service.

## Installation

```sh
npm install @aligent/aws-wrappers
```

## Conventions

Every wrapper takes the same optional constructor options:

```ts
new XService({ logger?, client? })
```

- `logger` — a Powertools `Logger`. Defaults to `new Logger()`, which picks up `POWERTOOLS_SERVICE_NAME` from the environment (recommended) and otherwise falls back to Powertools' own default.
- `client` — a pre-configured SDK client. When omitted, the wrapper instantiates the SDK client itself and wraps it with `captureAWSv3Client` for X-Ray tracing. When supplied, the wrapper passes it through unchanged — the caller is responsible for X-Ray instrumentation.

### Log redaction

Every wrapper emits one `logger.info` line per SDK call with a per-method safe-field allowlist (omitting payloads, secret material, and PII recipient identifiers). Set `POWERTOOLS_LOG_LEVEL=DEBUG` to unlock the full SDK input in those log lines — useful for local development and incident triage. See `packages/aws-wrappers/CLAUDE.md` for the per-method allowlists currently in force.

### X-Ray outside Lambda

X-Ray's middleware throws by default when no active segment exists, which is the case for CLI scripts and local development. Set the environment variable to silence the noise:

```sh
AWS_XRAY_CONTEXT_MISSING=IGNORE_ERROR
```

## S3

```ts
import { S3Service } from '@aligent/aws-wrappers';

const s3 = new S3Service();

await s3.putObject({ Bucket: 'my-bucket', Key: 'file.txt', Body: 'hello' });

await s3.putJsonObject({ Bucket: 'my-bucket', Key: 'data.json', Body: { foo: 'bar' } });
const data = await s3.getJsonObject<MyType>({ Bucket: 'my-bucket', Key: 'data.json' });

// getObject returns the raw GetObjectCommandOutput when you need metadata
// (LastModified, ContentLength, …) alongside the body.
const raw = await s3.getObject({ Bucket: 'my-bucket', Key: 'file.txt' });
const body = await s3.getObjectBody({ Bucket: 'my-bucket', Key: 'file.txt' });

const { LastModified } = await s3.headObject({ Bucket: 'my-bucket', Key: 'file.txt' });

const keys = await s3.listObjects('my-bucket', 'prefix/');
const items = await s3.getAllObjects<MyType>('my-bucket', 'prefix/');

await s3.copyObject({ Bucket: 'dest', Key: 'dest-key', CopySource: 'src/src-key' });

// Presigned URLs for direct browser-side download / upload.
// expiresIn defaults to 3600 seconds.
const downloadUrl = await s3.getPresignedUrl({
    Bucket: 'my-bucket',
    Key: 'file.txt',
    action: 'get',
});
const uploadUrl = await s3.getPresignedUrl({
    Bucket: 'my-bucket',
    Key: 'file.txt',
    action: 'put',
    expiresIn: 600,
});

await s3.deleteObject({ Bucket: 'my-bucket', Key: 'file.txt' });
await s3.deleteObjects('my-bucket', ['key1', 'key2']); // auto-chunked to 1000 keys per request
await s3.emptyBucket('my-bucket');                     // streams the listing + delegates each page to deleteObjects
```

Input shapes are intentionally tight (`Bucket`, `Key`, `Body` and similar). Callers needing SDK-specific options like server-side encryption or tagging should use `S3Client` directly.

## DynamoDB

```ts
import { DynamoDBService } from '@aligent/aws-wrappers';

const ddb = new DynamoDBService();

// Backed by DynamoDBDocumentClient — items are plain TS objects in both directions.
await ddb.putItem({ TableName: 'my-table', Item: { pk: 'abc', value: 42 } });

// Key-bearing methods take two generics: <K, R> for the key shape and the
// return / Attributes shape. Both default to Record<string, unknown> so callers
// can omit one or both when they don't care.
type MyKey = { pk: string };
type MyItem = { pk: string; value: number };

const item = await ddb.getItem<MyKey, MyItem>({
    TableName: 'my-table',
    Key: { pk: 'abc' },
});

const { Items } = await ddb.query<MyItem>({
    TableName: 'my-table',
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': 'abc' },
});

// scan returns the same shape as query — full output with Items typed as T[].
const { Items: all } = await ddb.scan<{ pk: string }>({ TableName: 'my-table' });

// updateItem / deleteItem mirror getItem's <K, R> generics.
const { Attributes } = await ddb.updateItem<MyKey, { value: number }>({
    TableName: 'my-table',
    Key: { pk: 'abc' },
    UpdateExpression: 'SET #v = :v',
    ExpressionAttributeNames: { '#v': 'value' },
    ExpressionAttributeValues: { ':v': 99 },
    ReturnValues: 'ALL_NEW',
});

await ddb.deleteItem({ TableName: 'my-table', Key: { pk: 'abc' } });

// batchWrite retries UnprocessedItems with jittered exponential backoff
// (5 attempts, 200ms base) and throws if any remain after the final attempt.
await ddb.batchWrite({
    RequestItems: {
        'my-table': [{ PutRequest: { Item: { pk: 'abc' } } }],
    },
});

// paginateItems / paginateScan yield each item — use for potentially unbounded result sets.
for await (const item of ddb.paginateItems<{ pk: string }>({
    TableName: 'my-table',
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': 'abc' },
})) {
    console.log(item.pk);
}

for await (const item of ddb.paginateScan<{ pk: string }>({ TableName: 'my-table' })) {
    console.log(item.pk);
}
```

`batchGet` is **not** generic — its `Responses` field is a multi-table record whose item shapes can differ per table, so no single generic can soundly describe it. Callers should narrow the result type at the call site.

## Secrets Manager

```ts
import { SecretsManagerService } from '@aligent/aws-wrappers';

const secrets = new SecretsManagerService();

const raw = await secrets.getSecret('my-secret-name');
const config = await secrets.getJsonSecret<MySecretShape>('my-secret-name');
```

`getSecret` throws when the response has no `SecretString` (e.g. a binary-only secret). `getJsonSecret` additionally throws if the secret value is not valid JSON. `VersionId` / `VersionStage` aren't exposed — use `SecretsManagerClient` directly if you need version pinning.

```ts
// Write operations. Prefer IaC (CDK / Terraform) for secret lifecycle;
// reserve these for rotation flows or dynamically-issued credentials.
await secrets.createSecret({ Name: 'my-secret', SecretString: 'shh' });
await secrets.updateSecret({ SecretId: 'my-secret', Description: 'updated' });
await secrets.putSecretValue({ SecretId: 'my-secret', SecretString: 'new-shh' });
await secrets.deleteSecret({ SecretId: 'my-secret', RecoveryWindowInDays: 7 });
```

## Step Functions

```ts
import { StepFunctionsService } from '@aligent/aws-wrappers';

const sfn = new StepFunctionsService();

// Auto-paginated — returns every execution across all pages.
const executions = await sfn.listExecutions({
    stateMachineArn: 'arn:aws:states:us-east-1:0:stateMachine:my-sfn',
    statusFilter: 'RUNNING',
});

const { executionArn } = await sfn.startExecution({
    stateMachineArn: 'arn:aws:states:us-east-1:0:stateMachine:my-sfn',
    input: JSON.stringify({ foo: 'bar' }),
});

const description = await sfn.describeExecution({ executionArn });

await sfn.stopExecution({ executionArn });
```

## EventBridge Scheduler

```ts
import { SchedulerService } from '@aligent/aws-wrappers';

const scheduler = new SchedulerService();

// FlexibleTimeWindow is required — pass { Mode: 'OFF' } for a fixed-time
// schedule. The wrapper bakes in no default.
await scheduler.createSchedule({
    Name: 'nightly-sync',
    GroupName: 'default',
    ScheduleExpression: 'rate(1 day)',
    FlexibleTimeWindow: { Mode: 'OFF' },
    Target: {
        Arn: 'arn:aws:lambda:us-east-1:0:function:my-fn',
        RoleArn: 'arn:aws:iam::0:role/scheduler-invoke',
        Input: JSON.stringify({ job: 'sync' }),
    },
});

const schedule = await scheduler.getSchedule({ Name: 'nightly-sync' });

// UpdateSchedule is a FULL REPLACEMENT, not a patch. Any omitted field is
// reset to its default, so resend the complete configuration and override
// only what changes. GetSchedule types every field as optional, so the
// required fields (Name, ScheduleExpression, FlexibleTimeWindow, Target) must
// be re-asserted after the spread.
await scheduler.updateSchedule({
    ...schedule,
    Name: 'nightly-sync',
    ScheduleExpression: 'rate(12 hours)', // the change
    FlexibleTimeWindow: schedule.FlexibleTimeWindow ?? { Mode: 'OFF' },
    Target: schedule.Target ?? {
        Arn: 'arn:aws:lambda:us-east-1:0:function:my-fn',
        RoleArn: 'arn:aws:iam::0:role/scheduler-invoke',
    },
});

// Auto-paginated — returns every summary across all pages.
const schedules = await scheduler.listSchedules({ GroupName: 'default' });

await scheduler.deleteSchedule({ Name: 'nightly-sync' });
```

`Target.Input` is the payload handed to the target and is omitted from INFO logs (it routinely carries PII); `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the full input.

```ts
// Schedule groups. Groups have no update operation — only create, get,
// delete, and list. Deleting a group deletes every schedule it contains.
await scheduler.createScheduleGroup({ Name: 'integrations' });
const group = await scheduler.getScheduleGroup({ Name: 'integrations' });
const groups = await scheduler.listScheduleGroups();
await scheduler.deleteScheduleGroup({ Name: 'integrations' });
```

## SSM Parameter Store

```ts
import { SSMService } from '@aligent/aws-wrappers';

const ssm = new SSMService();

const apiKey = await ssm.getParameter('/myapp/api-key');

// Supply an alias-to-path map — the result is keyed by the aliases so the
// SSM path is only mentioned at the call site.
const { host, port } = await ssm.getParameters({
    host: '/myapp/host',
    port: '/myapp/port',
});

// Auto-paginated, returns full Parameter[] (includes Version, LastModifiedDate).
// Recursive defaults to true.
const params = await ssm.getParametersByPath('/myapp/');
const shallow = await ssm.getParametersByPath('/myapp/', { recursive: false });
```

All read operations enable `WithDecryption` automatically — there's no opt-out. Callers needing plaintext should use `SSMClient` directly.

```ts
// Write operations. Prefer IaC (CDK / Terraform) for parameter lifecycle;
// reserve these for values that genuinely mutate at runtime.
await ssm.putParameter({
    Name: '/myapp/feature-flag',
    Value: 'enabled',
    Type: 'String',
    Overwrite: true,
});

await ssm.deleteParameter('/myapp/feature-flag');
```

## SQS

```ts
import { SQSService } from '@aligent/aws-wrappers';

const sqs = new SQSService();

await sqs.sendMessage({ QueueUrl, MessageBody: 'hello' });

// Returns Message[] — empty array when nothing's available.
const messages = await sqs.receiveMessages({ QueueUrl, WaitTimeSeconds: 20 });

for (const message of messages) {
    if (message.ReceiptHandle) {
        await sqs.deleteMessage({ QueueUrl, ReceiptHandle: message.ReceiptHandle });
    }
}

// Batch methods auto-chunk Entries to the SQS-enforced 10-entry limit.
await sqs.sendMessageBatch({ QueueUrl, Entries: bigEntryList });
await sqs.deleteMessageBatch({ QueueUrl, Entries: receiptEntries });
```

`receiveMessages` does **not** auto-delete — visibility-timeout semantics are the caller's responsibility.

```ts
// Opt-in truncation for oversized payloads. Defaults to off (SDK throws on
// oversize). Useful for fire-and-forget flows where dropped detail beats a
// thrown error.
const sqs = new SQSService({ truncate: true });            // per-instance default
await sqs.sendMessage({ QueueUrl, MessageBody: huge });
await sqs.sendMessage({ QueueUrl, MessageBody: huge }, { truncate: false }); // per-call override
```

## SNS

```ts
import { SNSService } from '@aligent/aws-wrappers';

const sns = new SNSService();

await sns.publish({ TopicArn, Message: 'hello' });

// publishBatch auto-chunks PublishBatchRequestEntries to the SNS-enforced 10-entry limit.
await sns.publishBatch({ TopicArn, PublishBatchRequestEntries: bigEntryList });

// Opt-in truncation — same shape as SQS. Truncates Message (256 KB byte-safe)
// and Subject (100 chars codepoint-safe) when enabled.
const truncSns = new SNSService({ truncate: true });
await truncSns.publish({ TopicArn, Message: huge, Subject: long });
await truncSns.publish({ TopicArn, Message: huge }, { truncate: false });
```

## Build / test

```sh
npm run build       # affected only
npm run test
npm run lint
```
