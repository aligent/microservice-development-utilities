[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / SNSService

# Class: SNSService

Defined in: [sns/sns.ts:20](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/sns/sns.ts#L20)

Wrapper around the AWS SNS client providing structured Powertools logging
and X-Ray tracing by default.

## Constructors

<a id="constructor"></a>

### Constructor

> **new SNSService**(`opts?`): `SNSService`

Defined in: [sns/sns.ts:30](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/sns/sns.ts#L30)

#### Parameters

##### opts?

###### client?

`SNSClient`

Optional pre-configured `SNSClient`. When supplied,
the wrapper does not apply X-Ray instrumentation.

###### logger?

`Logger`

Optional Powertools logger. Defaults to a logger with
`serviceName: 'SNSService'`.

#### Returns

`SNSService`

## Methods

<a id="publish"></a>

### publish()

> **publish**(`input`): `Promise`\<`PublishCommandOutput`\>

Defined in: [sns/sns.ts:39](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/sns/sns.ts#L39)

Publish a single message to an SNS topic.

#### Parameters

##### input

`PublishCommandInput`

PublishCommandInput including TopicArn and Message.

#### Returns

`Promise`\<`PublishCommandOutput`\>

***

<a id="publishbatch"></a>

### publishBatch()

> **publishBatch**(`input`): `Promise`\<`PublishBatchCommandOutput`[]\>

Defined in: [sns/sns.ts:51](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/sns/sns.ts#L51)

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
