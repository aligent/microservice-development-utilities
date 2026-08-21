[**@aligent/aws-wrappers**](../../modules.md)

***

[@aligent/aws-wrappers](../../modules.md) / [index](../modules.md) / SNSService

# Class: SNSService

Defined in: [sns/sns.ts:43](https://github.com/aligent/microservice-development-utilities/blob/e04daa76e0cc8e088b996db4b8b0bdc8466a8cbc/packages/aws-wrappers/src/sns/sns.ts#L43)

Wrapper around the AWS SNS client providing structured Powertools logging
and X-Ray tracing by default.

Where a method's input carries payloads, secret material or PII, the INFO
log line omits them; the verbose levels (`POWERTOOLS_LOG_LEVEL=DEBUG` or
`TRACE`) log full SDK inputs.

## Constructors

<a id="constructor"></a>

### Constructor

> **new SNSService**(`opts?`): `SNSService`

Defined in: [sns/sns.ts:59](https://github.com/aligent/microservice-development-utilities/blob/e04daa76e0cc8e088b996db4b8b0bdc8466a8cbc/packages/aws-wrappers/src/sns/sns.ts#L59)

#### Parameters

##### opts?

###### client?

`SNSClient`

Optional pre-configured `SNSClient`. When supplied,
the wrapper does not apply X-Ray instrumentation.

###### logger?

`LoggerInterface`

Optional Powertools logger. Defaults to `new Logger()`,
which picks up `POWERTOOLS_SERVICE_NAME` from the environment.

###### truncate?

`boolean`

When `true`, oversized `Message` / `Subject` are
truncated (byte-safe / codepoint-safe) before sending instead of failing
at the SDK. Defaults to `false` — the SDK throws on oversize, which is
usually the right failure mode. Each `publish` call can override via
its own `truncate` option.

#### Returns

`SNSService`

## Methods

<a id="publish"></a>

### publish()

> **publish**(`input`, `opts?`): `Promise`\<`PublishCommandOutput`\>

Defined in: [sns/sns.ts:73](https://github.com/aligent/microservice-development-utilities/blob/e04daa76e0cc8e088b996db4b8b0bdc8466a8cbc/packages/aws-wrappers/src/sns/sns.ts#L73)

Publish a single message to an SNS topic.

At INFO level the log line includes only routing / dedup metadata; see
`PUBLISH_SAFE_FIELDS` for the list.

#### Parameters

##### input

`PublishCommandInput`

PublishCommandInput including TopicArn and Message.

##### opts?

###### truncate?

`boolean`

#### Returns

`Promise`\<`PublishCommandOutput`\>

***

<a id="publishbatch"></a>

### publishBatch()

> **publishBatch**(`input`): `Promise`\<`PublishBatchCommandOutput`[]\>

Defined in: [sns/sns.ts:125](https://github.com/aligent/microservice-development-utilities/blob/e04daa76e0cc8e088b996db4b8b0bdc8466a8cbc/packages/aws-wrappers/src/sns/sns.ts#L125)

Publish a batch of messages to an SNS topic. The SNS API caps
PublishBatch at 10 entries per request, so this method auto-chunks
the caller's `PublishBatchRequestEntries` and sends one request per
chunk, returning the array of outputs.

#### Parameters

##### input

`PublishBatchCommandInput`

PublishBatchCommandInput including TopicArn and entries.

#### Returns

`Promise`\<`PublishBatchCommandOutput`[]\>
