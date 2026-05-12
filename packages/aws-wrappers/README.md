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

- `logger` — a Powertools `Logger`. Defaults to `new Logger({ serviceName: '<ClassName>' })`.
- `client` — a pre-configured SDK client. When omitted, the wrapper instantiates the SDK client itself and wraps it with `captureAWSv3Client` for X-Ray tracing. When supplied, the wrapper passes it through unchanged — the caller is responsible for X-Ray instrumentation.

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

const body = await s3.getObjectBody({ Bucket: 'my-bucket', Key: 'file.txt' });

const { LastModified } = await s3.headObject({ Bucket: 'my-bucket', Key: 'file.txt' });

const keys = await s3.listObjects('my-bucket', 'prefix/');
const items = await s3.getAllObjects<MyType>('my-bucket', 'prefix/');

await s3.copyObject({ Bucket: 'dest', Key: 'dest-key', CopySource: 'src/src-key' });

await s3.deleteObject({ Bucket: 'my-bucket', Key: 'file.txt' });
await s3.deleteObjects('my-bucket', ['key1', 'key2']); // auto-chunked to 1000 keys per request
await s3.emptyBucket('my-bucket');                    // auto-paginated + auto-chunked
```

Input shapes are intentionally tight (`Bucket`, `Key`, `Body` and similar). Callers needing SDK-specific options like server-side encryption or tagging should use `S3Client` directly.

## DynamoDB

```ts
import { DynamoDBService } from '@aligent/aws-wrappers';

const ddb = new DynamoDBService();

// Backed by DynamoDBDocumentClient — items are plain TS objects in both directions.
await ddb.putItem({ TableName: 'my-table', Item: { pk: 'abc', value: 42 } });

const item = await ddb.getItem<{ pk: string; value: number }>({
    TableName: 'my-table',
    Key: { pk: 'abc' },
});

const { Items } = await ddb.query<{ pk: string; value: number }>({
    TableName: 'my-table',
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': 'abc' },
});

// updateItem / deleteItem preserve the full output and type Attributes generically —
// pick T to match your ReturnValues choice.
const { Attributes } = await ddb.updateItem<{ value: number }>({
    TableName: 'my-table',
    Key: { pk: 'abc' },
    UpdateExpression: 'SET #v = :v',
    ExpressionAttributeNames: { '#v': 'value' },
    ExpressionAttributeValues: { ':v': 99 },
    ReturnValues: 'ALL_NEW',
});

// batchWrite retries UnprocessedItems with jittered exponential backoff
// (5 attempts, 200ms base) and throws if any remain after the final attempt.
await ddb.batchWrite({
    RequestItems: {
        'my-table': [{ PutRequest: { Item: { pk: 'abc' } } }],
    },
});

// paginateItems / paginateScan yield each item — use for unbounded result sets.
for await (const item of ddb.paginateItems<{ pk: string }>({
    TableName: 'my-table',
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': 'abc' },
})) {
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

`getSecret` throws when the response has no `SecretString` (e.g. a binary-only secret). `VersionId` / `VersionStage` aren't exposed — use `SecretsManagerClient` directly if you need version pinning.

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

## SSM Parameter Store

```ts
import { SSMService } from '@aligent/aws-wrappers';

const ssm = new SSMService();

const apiKey = await ssm.getParameter('/myapp/api-key');

// Returns a record keyed by parameter name — destructure directly.
const { '/myapp/host': host, '/myapp/port': port } = await ssm.getParameters([
    '/myapp/host',
    '/myapp/port',
]);

// Auto-paginated. Recursive defaults to true.
const params = await ssm.getParametersByPath('/myapp/');
const shallow = await ssm.getParametersByPath('/myapp/', { recursive: false });
```

All three operations enable `WithDecryption` automatically — there's no opt-out. Callers needing plaintext should use `SSMClient` directly.

## SQS

```ts
import { SQSService } from '@aligent/aws-wrappers';

const sqs = new SQSService();

await sqs.sendMessage({ QueueUrl, MessageBody: 'hello' });

// Returns Messages[] — empty array when nothing's available.
const messages = await sqs.receiveMessages({ QueueUrl, WaitTimeSeconds: 20 });

await sqs.deleteMessage({ QueueUrl, ReceiptHandle: messages[0]?.ReceiptHandle });

// Batch methods auto-chunk Entries to the SQS-enforced 10-entry limit.
await sqs.sendMessageBatch({ QueueUrl, Entries: bigEntryList });
await sqs.deleteMessageBatch({ QueueUrl, Entries: receiptEntries });
```

`receiveMessages` does **not** auto-delete — visibility-timeout semantics are the caller's responsibility.

## SNS

```ts
import { SNSService } from '@aligent/aws-wrappers';

const sns = new SNSService();

await sns.publish({ TopicArn, Message: 'hello' });

// publishBatch auto-chunks PublishBatchRequestEntries to the SNS-enforced 10-entry limit.
await sns.publishBatch({ TopicArn, PublishBatchRequestEntries: bigEntryList });
```

## Build / test

```sh
npm run build       # affected only
npm run test
npm run lint
```
