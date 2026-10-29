import { Logger } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';
import {
    EventBridgeClient,
    PutEventsCommand,
    PutEventsCommandInput,
    PutEventsCommandOutput,
    PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';
import xray from 'aws-xray-sdk-core';
import { BatchFailedEntry, throwIfRejected } from '../util/batch-operation-error.js';
import { chunk } from '../util/chunk.js';
import { redactInput } from '../util/redact.js';

const PUT_EVENTS_LIMIT = 10;

/**
 * `Detail`, `Resources` and the entries themselves are payload carriers, so
 * the INFO line carries only the endpoint id and how many entries were sent.
 */
function summariseEntries({ EndpointId, Entries }: PutEventsCommandInput) {
    return { EndpointId, entryCount: Entries?.length ?? 0 };
}

/**
 * Chunks are full except the last, so the caller's original index of a
 * rejected entry is the chunk's offset (chunk number times the chunk size)
 * plus its position within the chunk.
 */
function extractPutEventsFailures(results: PutEventsCommandOutput[]): BatchFailedEntry[] {
    return results.flatMap((result, chunkIndex) =>
        extractChunkFailures(result, chunkIndex * PUT_EVENTS_LIMIT)
    );
}

/**
 * `PutEvents` reports a rejected entry by an error code on the result entry at
 * the same position as the request entry.
 *
 * Copies only code and message out, never the request entry, so neither the
 * error nor the warning can carry event detail.
 */
function extractChunkFailures(result: PutEventsCommandOutput, offset: number): BatchFailedEntry[] {
    return (result.Entries ?? [])
        .map(({ ErrorCode, ErrorMessage }, position) => ({
            id: String(offset + position),
            code: ErrorCode,
            message: ErrorMessage,
        }))
        .filter(({ code }) => code !== undefined);
}

/**
 * Wrapper around the AWS EventBridge client providing structured Powertools
 * logging and X-Ray tracing by default.
 *
 * Where a method's input carries payloads, secret material or PII, the INFO
 * log line omits them; the verbose levels (`POWERTOOLS_LOG_LEVEL=DEBUG` or
 * `TRACE`) log full SDK inputs.
 *
 * Covers `putEvents` only. Named `EventBridgeService` for the event bus API;
 * schedules live in `SchedulerService`.
 */
export class EventBridgeService {
    private readonly client: EventBridgeClient;
    private readonly logger: LoggerInterface;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `EventBridgeClient`. When
     * supplied, the wrapper does not apply X-Ray instrumentation.
     */
    constructor(opts?: { logger?: LoggerInterface; client?: EventBridgeClient }) {
        this.client = opts?.client ?? xray.captureAWSv3Client(new EventBridgeClient());
        this.logger = opts?.logger ?? new Logger();
    }

    /**
     * Publish events to an event bus. The EventBridge API caps `PutEvents` at
     * 10 entries per request, so this method auto-chunks the caller's `Entries`
     * and sends one request per chunk, returning the array of outputs. The
     * remaining request fields (such as `EndpointId`) are carried onto every
     * chunk.
     *
     * Chunking is by count only. The 256 KB request size limit is not enforced
     * here: a chunk that exceeds it fails at the SDK as a request-level error.
     *
     * Every chunk is sent before the outcome is judged. If EventBridge rejected
     * any entry (it reports an error code on the result entry), a
     * {@link BatchOperationError} is then thrown carrying the per-chunk results
     * and the failed entries. For this method each failed entry's `id` is
     * always set, to the entry's index in the caller's original `Entries` list
     * across all chunks, as a string. Only `id`, `code` and `message` are
     * copied out, so event detail never reaches the error.
     *
     * No retries are performed. Request-level SDK exceptions (throttling,
     * access denied, oversize request) are not wrapped: they propagate
     * unchanged and immediately, so earlier chunks may already have been
     * published.
     *
     * At INFO level the log line includes only the endpoint id and the entry
     * count, because `Detail`, `Resources` and the entries themselves are
     * payload carriers.
     *
     * @param input - PutEventsCommandInput including Entries.
     */
    async putEvents(input: PutEventsCommandInput): Promise<PutEventsCommandOutput[]> {
        const entries: PutEventsRequestEntry[] = input.Entries ?? [];
        this.logger.info('Putting EventBridge events', {
            input: redactInput(this.logger, input, summariseEntries),
        });
        const results: PutEventsCommandOutput[] = [];
        for (const batch of chunk(entries, PUT_EVENTS_LIMIT)) {
            results.push(
                await this.client.send(new PutEventsCommand({ ...input, Entries: batch }))
            );
        }
        return throwIfRejected(
            this.logger,
            'EventBridge putEvents',
            results,
            extractPutEventsFailures(results)
        );
    }
}
