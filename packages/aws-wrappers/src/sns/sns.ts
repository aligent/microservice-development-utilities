import { Logger } from '@aws-lambda-powertools/logger';
import {
    PublishBatchCommand,
    PublishBatchCommandInput,
    PublishBatchCommandOutput,
    PublishBatchRequestEntry,
    PublishCommand,
    PublishCommandInput,
    PublishCommandOutput,
    SNSClient,
} from '@aws-sdk/client-sns';
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import { filterFieldsForLogLevel } from '../util/redact';
import { truncateCodepoints, truncateUtf8 } from '../util/truncate';

const PUBLISH_BATCH_LIMIT = 10;
const SNS_MESSAGE_MAX_BYTES = 256 * 1024;
const SNS_SUBJECT_MAX_CHARS = 100;

/**
 * Fields safe to log at INFO level for `publish`. Omits `Message`, `Subject`,
 * `MessageAttributes`, and `PhoneNumber` — payloads, user-visible content
 * (subjects often carry order numbers / customer names), and PII recipient
 * identifiers. `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the full input.
 */
const PUBLISH_SAFE_FIELDS: ReadonlyArray<keyof PublishCommandInput> = [
    'TopicArn',
    'TargetArn',
    'MessageStructure',
    'MessageGroupId',
    'MessageDeduplicationId',
];

/**
 * Wrapper around the AWS SNS client providing structured Powertools logging
 * and X-Ray tracing by default.
 */
export class SNSService {
    private readonly client: SNSClient;
    private readonly logger: Logger;
    private readonly truncate: boolean;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `SNSClient`. When supplied,
     * the wrapper does not apply X-Ray instrumentation.
     * @param opts.truncate - When `true`, oversized `Message` / `Subject` are
     * truncated (byte-safe / codepoint-safe) before sending instead of failing
     * at the SDK. Defaults to `false` — the SDK throws on oversize, which is
     * usually the right failure mode. Each `publish` call can override via
     * its own `truncate` option.
     */
    constructor(opts?: { logger?: Logger; client?: SNSClient; truncate?: boolean }) {
        this.client = opts?.client ?? captureAWSv3Client(new SNSClient());
        this.logger = opts?.logger ?? new Logger();
        this.truncate = opts?.truncate ?? false;
    }

    /**
     * Publish a single message to an SNS topic.
     *
     * At INFO level the log line includes only routing / dedup metadata; see
     * `PUBLISH_SAFE_FIELDS` for the list. Setting `POWERTOOLS_LOG_LEVEL=DEBUG`
     * unlocks the full input.
     *
     * @param input - PublishCommandInput including TopicArn and Message.
     */
    async publish(
        input: PublishCommandInput,
        opts?: { truncate?: boolean }
    ): Promise<PublishCommandOutput> {
        const shouldTruncate = opts?.truncate ?? this.truncate;
        const effective = shouldTruncate ? this.applyTruncation(input) : input;
        this.logger.info('Publishing SNS message', {
            input: filterFieldsForLogLevel(this.logger, effective, PUBLISH_SAFE_FIELDS),
        });
        return this.client.send(new PublishCommand(effective));
    }

    private applyTruncation(input: PublishCommandInput): PublishCommandInput {
        const truncated: string[] = [];
        let Message = input.Message;
        if (Message !== undefined && Buffer.byteLength(Message, 'utf8') > SNS_MESSAGE_MAX_BYTES) {
            Message = truncateUtf8(Message, SNS_MESSAGE_MAX_BYTES);
            truncated.push('Message');
        }
        let Subject = input.Subject;
        if (Subject !== undefined && Array.from(Subject).length > SNS_SUBJECT_MAX_CHARS) {
            Subject = truncateCodepoints(Subject, SNS_SUBJECT_MAX_CHARS);
            truncated.push('Subject');
        }
        if (truncated.length > 0) {
            this.logger.warn('Truncated SNS publish input', { fields: truncated });
        }
        return { ...input, Message, Subject };
    }

    /**
     * Publish a batch of messages to an SNS topic. The SNS API caps
     * PublishBatch at 10 entries per request, so this method auto-chunks
     * the caller's `PublishBatchRequestEntries` and sends one request per
     * chunk, returning the array of outputs.
     * @param input - PublishBatchCommandInput including TopicArn and entries.
     */
    async publishBatch(input: PublishBatchCommandInput): Promise<PublishBatchCommandOutput[]> {
        const entries: PublishBatchRequestEntry[] = input.PublishBatchRequestEntries ?? [];
        // Inline DEBUG check rather than `filterFieldsForLogLevel` because the
        // safe log shape includes the computed `entryCount`, which isn't a key
        // on `PublishBatchCommandInput`.
        const isDebug = this.logger.getLevelName() === 'DEBUG';
        this.logger.info('Publishing SNS message batch', {
            input: isDebug ? input : { TopicArn: input.TopicArn, entryCount: entries.length },
        });
        const results: PublishBatchCommandOutput[] = [];
        for (let i = 0; i < entries.length; i += PUBLISH_BATCH_LIMIT) {
            const chunk = entries.slice(i, i + PUBLISH_BATCH_LIMIT);
            results.push(
                await this.client.send(
                    new PublishBatchCommand({
                        ...input,
                        PublishBatchRequestEntries: chunk,
                    })
                )
            );
        }
        return results;
    }
}
