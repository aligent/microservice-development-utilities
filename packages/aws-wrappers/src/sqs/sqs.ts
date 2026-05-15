import { Logger } from '@aws-lambda-powertools/logger';
import {
    DeleteMessageBatchCommand,
    DeleteMessageBatchCommandInput,
    DeleteMessageBatchCommandOutput,
    DeleteMessageBatchRequestEntry,
    DeleteMessageCommand,
    DeleteMessageCommandInput,
    DeleteMessageCommandOutput,
    Message,
    ReceiveMessageCommand,
    ReceiveMessageCommandInput,
    SendMessageBatchCommand,
    SendMessageBatchCommandInput,
    SendMessageBatchCommandOutput,
    SendMessageBatchRequestEntry,
    SendMessageCommand,
    SendMessageCommandInput,
    SendMessageCommandOutput,
    SQSClient,
} from '@aws-sdk/client-sqs';
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import { filterFieldsForLogLevel } from '../util/redact';
import { truncateUtf8 } from '../util/truncate';

const SQS_BATCH_LIMIT = 10;
const SQS_MESSAGE_BODY_MAX_BYTES = 256 * 1024;

/**
 * Fields safe to log at INFO level for `sendMessage`. Omits `MessageBody` and
 * `MessageAttributes` — both carry payload content.
 * `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the full input.
 */
const SEND_MESSAGE_SAFE_FIELDS: ReadonlyArray<keyof SendMessageCommandInput> = [
    'QueueUrl',
    'DelaySeconds',
    'MessageGroupId',
    'MessageDeduplicationId',
];

/**
 * Wrapper around the AWS SQS client providing structured Powertools logging
 * and X-Ray tracing by default.
 */
export class SQSService {
    private readonly client: SQSClient;
    private readonly logger: Logger;
    private readonly truncate: boolean;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `SQSClient`. When supplied,
     * the wrapper does not apply X-Ray instrumentation.
     * @param opts.truncate - When `true`, oversized `MessageBody` is truncated
     * (byte-safe) before sending instead of failing at the SDK. Defaults to
     * `false`. Each `sendMessage` call can override via its own `truncate`
     * option.
     */
    constructor(opts?: { logger?: Logger; client?: SQSClient; truncate?: boolean }) {
        this.client = opts?.client ?? captureAWSv3Client(new SQSClient());
        this.logger = opts?.logger ?? new Logger();
        this.truncate = opts?.truncate ?? false;
    }

    /**
     * Send a single message to an SQS queue.
     *
     * At INFO level the log line includes only queue routing / FIFO metadata;
     * see `SEND_MESSAGE_SAFE_FIELDS`. `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the
     * full input.
     */
    async sendMessage(
        input: SendMessageCommandInput,
        opts?: { truncate?: boolean }
    ): Promise<SendMessageCommandOutput> {
        const shouldTruncate = opts?.truncate ?? this.truncate;
        const effective = shouldTruncate ? this.applyTruncation(input) : input;
        this.logger.info('Sending SQS message', {
            input: filterFieldsForLogLevel(this.logger, effective, SEND_MESSAGE_SAFE_FIELDS),
        });
        return this.client.send(new SendMessageCommand(effective));
    }

    private applyTruncation(input: SendMessageCommandInput): SendMessageCommandInput {
        const truncated: string[] = [];
        let MessageBody = input.MessageBody;
        if (
            MessageBody !== undefined &&
            Buffer.byteLength(MessageBody, 'utf8') > SQS_MESSAGE_BODY_MAX_BYTES
        ) {
            MessageBody = truncateUtf8(MessageBody, SQS_MESSAGE_BODY_MAX_BYTES);
            truncated.push('MessageBody');
        }
        if (truncated.length > 0) {
            this.logger.warn('Truncated SQS sendMessage input', { fields: truncated });
        }
        return { ...input, MessageBody };
    }

    /**
     * Receive messages from an SQS queue. Returns an empty array when no
     * messages are available. No automatic deletion is performed — visibility
     * timeout semantics are the caller's responsibility.
     * @returns The `Messages` array from the response, or `[]` if absent.
     */
    async receiveMessages(input: ReceiveMessageCommandInput): Promise<Message[]> {
        this.logger.info('Receiving SQS messages', { input });
        const response = await this.client.send(new ReceiveMessageCommand(input));
        return response.Messages ?? [];
    }

    /**
     * Delete a single message from an SQS queue.
     */
    async deleteMessage(input: DeleteMessageCommandInput): Promise<DeleteMessageCommandOutput> {
        this.logger.info('Deleting SQS message', { input });
        return this.client.send(new DeleteMessageCommand(input));
    }

    /**
     * Send a batch of messages to an SQS queue. The SQS API caps
     * SendMessageBatch at 10 entries per request, so this method auto-chunks
     * the caller's entries and sends one request per chunk.
     */
    async sendMessageBatch(
        input: SendMessageBatchCommandInput
    ): Promise<SendMessageBatchCommandOutput[]> {
        const entries: SendMessageBatchRequestEntry[] = input.Entries ?? [];
        // Inline DEBUG check rather than `filterFieldsForLogLevel` because the
        // safe log shape includes the computed `entryCount`, which isn't a key
        // on `SendMessageBatchCommandInput`.
        const isDebug = this.logger.getLevelName() === 'DEBUG';
        this.logger.info('Sending SQS message batch', {
            input: isDebug ? input : { QueueUrl: input.QueueUrl, entryCount: entries.length },
        });
        const results: SendMessageBatchCommandOutput[] = [];
        for (let i = 0; i < entries.length; i += SQS_BATCH_LIMIT) {
            const chunk = entries.slice(i, i + SQS_BATCH_LIMIT);
            results.push(
                await this.client.send(new SendMessageBatchCommand({ ...input, Entries: chunk }))
            );
        }
        return results;
    }

    /**
     * Delete a batch of messages from an SQS queue. The SQS API caps
     * DeleteMessageBatch at 10 entries per request, so this method auto-chunks
     * the caller's entries and sends one request per chunk.
     */
    async deleteMessageBatch(
        input: DeleteMessageBatchCommandInput
    ): Promise<DeleteMessageBatchCommandOutput[]> {
        const entries: DeleteMessageBatchRequestEntry[] = input.Entries ?? [];
        // Inline DEBUG check rather than `filterFieldsForLogLevel` because the
        // safe log shape includes the computed `entryCount`, which isn't a key
        // on `DeleteMessageBatchCommandInput`.
        const isDebug = this.logger.getLevelName() === 'DEBUG';
        this.logger.info('Deleting SQS message batch', {
            input: isDebug ? input : { QueueUrl: input.QueueUrl, entryCount: entries.length },
        });
        const results: DeleteMessageBatchCommandOutput[] = [];
        for (let i = 0; i < entries.length; i += SQS_BATCH_LIMIT) {
            const chunk = entries.slice(i, i + SQS_BATCH_LIMIT);
            results.push(
                await this.client.send(new DeleteMessageBatchCommand({ ...input, Entries: chunk }))
            );
        }
        return results;
    }
}
