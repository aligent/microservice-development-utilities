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

const PUBLISH_BATCH_LIMIT = 10;

/**
 * Wrapper around the AWS SNS client providing structured Powertools logging
 * and X-Ray tracing by default.
 */
export class SNSService {
    private readonly client: SNSClient;
    private readonly logger: Logger;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `SNSClient`. When supplied,
     * the wrapper does not apply X-Ray instrumentation.
     */
    constructor(opts?: { logger?: Logger; client?: SNSClient }) {
        this.client = opts?.client ?? captureAWSv3Client(new SNSClient());
        this.logger = opts?.logger ?? new Logger();
    }

    /**
     * Publish a single message to an SNS topic.
     * @param input - PublishCommandInput including TopicArn and Message.
     */
    async publish(input: PublishCommandInput): Promise<PublishCommandOutput> {
        this.logger.info('Publishing SNS message', { input });
        return this.client.send(new PublishCommand(input));
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
        this.logger.info('Publishing SNS message batch', {
            input: { TopicArn: input.TopicArn, entryCount: entries.length },
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
