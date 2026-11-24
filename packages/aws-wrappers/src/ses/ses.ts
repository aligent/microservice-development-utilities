import { Logger } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';
import {
    BulkEmailEntry,
    SendBulkEmailCommand,
    SendBulkEmailCommandInput,
    SendBulkEmailCommandOutput,
    SendEmailCommand,
    SendEmailCommandInput,
    SendEmailCommandOutput,
    SESv2Client,
} from '@aws-sdk/client-sesv2';
import xray from 'aws-xray-sdk-core';
import { BatchFailedEntry, throwIfAny } from '../util/batch-operation-error.js';
import { chunk, originalIndex } from '../util/chunk.js';
import { redactInput } from '../util/redact.js';

const SEND_BULK_EMAIL_LIMIT = 50;

/**
 * Sent entries whose result isn't `SUCCESS`, identified by their original
 * index in the caller's `BulkEmailEntries`. Walks the entries that were sent
 * rather than the results that came back, so an entry SES returned no result
 * for counts as failed instead of passing unnoticed. Only status and error are
 * copied out, never the entry, so no destination can leak.
 */
function extractBulkEmailFailures(
    sentChunks: ReadonlyArray<readonly BulkEmailEntry[]>,
    results: readonly SendBulkEmailCommandOutput[]
): BatchFailedEntry[] {
    return sentChunks.flatMap((sent, chunkIndex) =>
        sent.flatMap((_, entryIndex) => {
            const result = results[chunkIndex]?.BulkEmailEntryResults?.[entryIndex];
            if (result?.Status === 'SUCCESS') return [];
            return [
                {
                    id: originalIndex(chunkIndex, SEND_BULK_EMAIL_LIMIT, entryIndex),
                    code: result?.Status,
                    message: result?.Error ?? result?.Status ?? 'No status returned for entry',
                },
            ];
        })
    );
}

/**
 * Safe log shape for `sendEmail`. Keeps routing metadata and reduces the
 * recipients to a count; the sender and reply-to addresses, the subject, the
 * body and any template data are omitted as PII or payload. The template name
 * is operational metadata, not PII, so it is kept.
 */
function summariseSendEmail(input: SendEmailCommandInput): {
    FromEmailAddressIdentityArn: string | undefined;
    ConfigurationSetName: string | undefined;
    EmailTags: SendEmailCommandInput['EmailTags'];
    EndpointId: string | undefined;
    TenantName: string | undefined;
    templateName: string | undefined;
    recipientCount: number;
} {
    const { ToAddresses, CcAddresses, BccAddresses } = input.Destination ?? {};
    return {
        FromEmailAddressIdentityArn: input.FromEmailAddressIdentityArn,
        ConfigurationSetName: input.ConfigurationSetName,
        EmailTags: input.EmailTags,
        EndpointId: input.EndpointId,
        TenantName: input.TenantName,
        templateName: input.Content?.Template?.TemplateName,
        recipientCount:
            (ToAddresses?.length ?? 0) + (CcAddresses?.length ?? 0) + (BccAddresses?.length ?? 0),
    };
}

/**
 * Safe log shape for `sendBulkEmail`. The entries carry destinations and
 * replacement data, and the default template data may carry PII, so they are
 * reduced to a count and the template name.
 */
function summariseSendBulkEmail(input: SendBulkEmailCommandInput): {
    FromEmailAddressIdentityArn: string | undefined;
    ConfigurationSetName: string | undefined;
    DefaultEmailTags: SendBulkEmailCommandInput['DefaultEmailTags'];
    EndpointId: string | undefined;
    TenantName: string | undefined;
    templateName: string | undefined;
    entryCount: number;
} {
    return {
        FromEmailAddressIdentityArn: input.FromEmailAddressIdentityArn,
        ConfigurationSetName: input.ConfigurationSetName,
        DefaultEmailTags: input.DefaultEmailTags,
        EndpointId: input.EndpointId,
        TenantName: input.TenantName,
        templateName: input.DefaultContent?.Template?.TemplateName,
        entryCount: input.BulkEmailEntries?.length ?? 0,
    };
}

/**
 * Wrapper around the AWS SES v2 client providing structured Powertools logging
 * and X-Ray tracing by default.
 *
 * Wraps SES v2 (`@aws-sdk/client-sesv2`), not the legacy v1 API. No defaults
 * are baked in: every send option, including `FromEmailAddress` and
 * `ConfigurationSetName`, comes from the caller.
 *
 * Where a method's input carries payloads or PII, the INFO log line omits
 * them; the verbose levels (`POWERTOOLS_LOG_LEVEL=DEBUG` or `TRACE`) log full
 * SDK inputs.
 */
export class SESService {
    private readonly client: SESv2Client;
    private readonly logger: LoggerInterface;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `SESv2Client`. When supplied,
     * the wrapper does not apply X-Ray instrumentation.
     */
    constructor(opts?: { logger?: LoggerInterface; client?: SESv2Client }) {
        this.client = opts?.client ?? xray.captureAWSv3Client(new SESv2Client());
        this.logger = opts?.logger ?? new Logger();
    }

    /**
     * Send a single email (Simple, Raw or Template content).
     *
     * At INFO level the log line includes only routing metadata and a
     * recipient count; see `summariseSendEmail`.
     *
     * Pass-through: SDK exceptions (`MessageRejected`, `SendingPausedException`,
     * …) propagate unwrapped.
     *
     * @returns The SDK output, including `MessageId`.
     */
    async sendEmail(input: SendEmailCommandInput): Promise<SendEmailCommandOutput> {
        this.logger.info('Sending SES email', {
            input: redactInput(this.logger, input, summariseSendEmail),
        });
        return this.client.send(new SendEmailCommand(input));
    }

    /**
     * Send a templated email to many destinations. SES caps `SendBulkEmail`
     * at 50 entries per request, so this method auto-chunks `BulkEmailEntries`
     * and sends one request per chunk, in order. Every chunk shares the other
     * input fields.
     *
     * At INFO level the log line includes only routing metadata, the template
     * name and an entry count; see `summariseSendBulkEmail`.
     *
     * SES answers HTTP 200 even when entries fail, so every chunk is sent
     * before the outcome is judged. If any entry's `Status` isn't `SUCCESS`
     * (or SES returned no result for it), a {@link BatchOperationError} is thrown whose
     * `failed[].id` is the entry's original index in `BulkEmailEntries` as a
     * string, and whose `results` are the per-chunk outputs — so a caller can
     * retry only the failed indexes. Request-level SDK exceptions are not
     * wrapped.
     *
     * Sending is not idempotent: retrying the whole batch after a throw
     * re-sends the entries that succeeded.
     *
     * @returns One SDK output per request sent.
     */
    async sendBulkEmail(input: SendBulkEmailCommandInput): Promise<SendBulkEmailCommandOutput[]> {
        this.logger.info('Sending SES bulk email', {
            input: redactInput(this.logger, input, summariseSendBulkEmail),
        });
        const results: SendBulkEmailCommandOutput[] = [];
        const sentChunks = chunk(input.BulkEmailEntries ?? [], SEND_BULK_EMAIL_LIMIT);
        for (const entries of sentChunks) {
            results.push(
                await this.client.send(
                    new SendBulkEmailCommand({ ...input, BulkEmailEntries: entries })
                )
            );
        }
        return throwIfAny(
            this.logger,
            'SES sendBulkEmail',
            results,
            extractBulkEmailFailures(sentChunks, results)
        );
    }
}
