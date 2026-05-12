[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / SQSService

# Class: SQSService

Defined in: [sqs/sqs.ts:30](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/sqs/sqs.ts#L30)

Wrapper around the AWS SQS client providing structured Powertools logging
and X-Ray tracing by default.

## Constructors

<a id="constructor"></a>

### Constructor

> **new SQSService**(`opts?`): `SQSService`

Defined in: [sqs/sqs.ts:40](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/sqs/sqs.ts#L40)

#### Parameters

##### opts?

###### client?

`SQSClient`

Optional pre-configured `SQSClient`. When supplied,
the wrapper does not apply X-Ray instrumentation.

###### logger?

`Logger`

Optional Powertools logger. Defaults to a logger with
`serviceName: 'SQSService'`.

#### Returns

`SQSService`

## Methods

<a id="deletemessage"></a>

### deleteMessage()

> **deleteMessage**(`input`): `Promise`\<`DeleteMessageCommandOutput`\>

Defined in: [sqs/sqs.ts:68](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/sqs/sqs.ts#L68)

Delete a single message from an SQS queue.

#### Parameters

##### input

`DeleteMessageCommandInput`

#### Returns

`Promise`\<`DeleteMessageCommandOutput`\>

***

<a id="deletemessagebatch"></a>

### deleteMessageBatch()

> **deleteMessageBatch**(`input`): `Promise`\<`DeleteMessageBatchCommandOutput`[]\>

Defined in: [sqs/sqs.ts:100](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/sqs/sqs.ts#L100)

Delete a batch of messages from an SQS queue. The SQS API caps
DeleteMessageBatch at 10 entries per request, so this method auto-chunks
the caller's entries and sends one request per chunk.

#### Parameters

##### input

`DeleteMessageBatchCommandInput`

#### Returns

`Promise`\<`DeleteMessageBatchCommandOutput`[]\>

***

<a id="receivemessages"></a>

### receiveMessages()

> **receiveMessages**(`input`): `Promise`\<`Message`[]\>

Defined in: [sqs/sqs.ts:59](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/sqs/sqs.ts#L59)

Receive messages from an SQS queue. Returns an empty array when no
messages are available. No automatic deletion is performed — visibility
timeout semantics are the caller's responsibility.

#### Parameters

##### input

`ReceiveMessageCommandInput`

#### Returns

`Promise`\<`Message`[]\>

The `Messages` array from the response, or `[]` if absent.

***

<a id="sendmessage"></a>

### sendMessage()

> **sendMessage**(`input`): `Promise`\<`SendMessageCommandOutput`\>

Defined in: [sqs/sqs.ts:48](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/sqs/sqs.ts#L48)

Send a single message to an SQS queue.

#### Parameters

##### input

`SendMessageCommandInput`

#### Returns

`Promise`\<`SendMessageCommandOutput`\>

***

<a id="sendmessagebatch"></a>

### sendMessageBatch()

> **sendMessageBatch**(`input`): `Promise`\<`SendMessageBatchCommandOutput`[]\>

Defined in: [sqs/sqs.ts:78](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/sqs/sqs.ts#L78)

Send a batch of messages to an SQS queue. The SQS API caps
SendMessageBatch at 10 entries per request, so this method auto-chunks
the caller's entries and sends one request per chunk.

#### Parameters

##### input

`SendMessageBatchCommandInput`

#### Returns

`Promise`\<`SendMessageBatchCommandOutput`[]\>
