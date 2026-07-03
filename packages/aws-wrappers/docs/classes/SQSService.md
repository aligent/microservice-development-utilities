[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / SQSService

# Class: SQSService

Defined in: [sqs/sqs.ts:46](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/sqs/sqs.ts#L46)

Wrapper around the AWS SQS client providing structured Powertools logging
and X-Ray tracing by default.

## Constructors

<a id="constructor"></a>

### Constructor

> **new SQSService**(`opts?`): `SQSService`

Defined in: [sqs/sqs.ts:61](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/sqs/sqs.ts#L61)

#### Parameters

##### opts?

###### client?

`SQSClient`

Optional pre-configured `SQSClient`. When supplied,
the wrapper does not apply X-Ray instrumentation.

###### logger?

`LoggerInterface`

Optional Powertools logger. Defaults to `new Logger()`,
which picks up `POWERTOOLS_SERVICE_NAME` from the environment.

###### truncate?

`boolean`

When `true`, oversized `MessageBody` is truncated
(byte-safe) before sending instead of failing at the SDK. Defaults to
`false`. Each `sendMessage` call can override via its own `truncate`
option.

#### Returns

`SQSService`

## Methods

<a id="deletemessage"></a>

### deleteMessage()

> **deleteMessage**(`input`): `Promise`\<`DeleteMessageCommandOutput`\>

Defined in: [sqs/sqs.ts:117](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/sqs/sqs.ts#L117)

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

Defined in: [sqs/sqs.ts:153](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/sqs/sqs.ts#L153)

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

Defined in: [sqs/sqs.ts:108](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/sqs/sqs.ts#L108)

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

> **sendMessage**(`input`, `opts?`): `Promise`\<`SendMessageCommandOutput`\>

Defined in: [sqs/sqs.ts:74](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/sqs/sqs.ts#L74)

Send a single message to an SQS queue.

At INFO level the log line includes only queue routing / FIFO metadata;
see `SEND_MESSAGE_SAFE_FIELDS`. `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the
full input.

#### Parameters

##### input

`SendMessageCommandInput`

##### opts?

###### truncate?

`boolean`

#### Returns

`Promise`\<`SendMessageCommandOutput`\>

***

<a id="sendmessagebatch"></a>

### sendMessageBatch()

> **sendMessageBatch**(`input`): `Promise`\<`SendMessageBatchCommandOutput`[]\>

Defined in: [sqs/sqs.ts:127](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/sqs/sqs.ts#L127)

Send a batch of messages to an SQS queue. The SQS API caps
SendMessageBatch at 10 entries per request, so this method auto-chunks
the caller's entries and sends one request per chunk.

#### Parameters

##### input

`SendMessageBatchCommandInput`

#### Returns

`Promise`\<`SendMessageBatchCommandOutput`[]\>
