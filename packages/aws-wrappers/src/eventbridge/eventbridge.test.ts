import { Logger } from '@aws-lambda-powertools/logger';
import {
    EventBridgeClient,
    PutEventsCommand,
    PutEventsCommandOutput,
    PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';
import { mockClient } from 'aws-sdk-client-mock';
import xray from 'aws-xray-sdk-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BatchOperationError } from '../util/batch-operation-error.js';
import { batchFailure } from '../util/batch-operation-error.test-helpers.js';
import { EventBridgeService } from './eventbridge';

const eventBridgeMock = mockClient(EventBridgeClient);

const EndpointId = 'abc123.veo';

const entries = (count: number): PutEventsRequestEntry[] =>
    Array.from({ length: count }, (_, i) => ({
        Source: 'test.source',
        DetailType: 'TestEvent',
        Detail: JSON.stringify({ secret: `detail-${i}` }),
    }));

describe('EventBridgeService', () => {
    afterEach(() => {
        eventBridgeMock.reset();
    });

    it('constructs with default logger and client when no options supplied', () => {
        expect(() => new EventBridgeService()).not.toThrow();
    });

    it('instruments the default client with X-Ray but leaves an injected client alone', () => {
        const captureSpy = vi.spyOn(xray, 'captureAWSv3Client');

        new EventBridgeService({ client: new EventBridgeClient({}) });
        expect(captureSpy).not.toHaveBeenCalled();

        new EventBridgeService();
        expect(captureSpy).toHaveBeenCalledTimes(1);

        captureSpy.mockRestore();
    });

    describe('putEvents', () => {
        const service = () => new EventBridgeService({ client: new EventBridgeClient({}) });

        it('chunks entries into 10-entry requests and carries other fields onto every chunk', async () => {
            eventBridgeMock.on(PutEventsCommand).resolves({ FailedEntryCount: 0, Entries: [] });

            const results = await service().putEvents({ EndpointId, Entries: entries(23) });

            const calls = eventBridgeMock.commandCalls(PutEventsCommand);
            expect(calls.map(c => c.args[0].input.Entries?.length)).toEqual([10, 10, 3]);
            expect(calls.map(c => c.args[0].input.EndpointId)).toEqual([
                EndpointId,
                EndpointId,
                EndpointId,
            ]);
            expect(results).toHaveLength(3);
        });

        it('returns the per-chunk outputs unchanged when no entry fails', async () => {
            const first = { FailedEntryCount: 0, Entries: [{ EventId: 'e-1' }] };
            const second = { FailedEntryCount: 0, Entries: [{ EventId: 'e-2' }] };
            eventBridgeMock.on(PutEventsCommand).resolvesOnce(first).resolvesOnce(second);

            const results = await service().putEvents({ Entries: entries(11) });

            expect(results).toEqual([
                expect.objectContaining(first),
                expect.objectContaining(second),
            ]);
        });

        it('returns an empty array without calling the SDK when entries are empty or undefined', async () => {
            const emptyResult = await service().putEvents({ Entries: [] });
            const undefinedResult = await service().putEvents(
                {} as Parameters<EventBridgeService['putEvents']>[0]
            );

            expect(emptyResult).toEqual([]);
            expect(undefinedResult).toEqual([]);
            expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(0);
        });

        describe('partial failure', () => {
            const rejectedChunks = (...chunks: Array<PutEventsCommandOutput['Entries']>) => {
                const stub = eventBridgeMock.on(PutEventsCommand);
                for (const chunkEntries of chunks) {
                    stub.resolvesOnce({
                        FailedEntryCount: chunkEntries?.filter(e => e.ErrorCode).length ?? 0,
                        Entries: chunkEntries,
                    });
                }
            };
            const accepted = (count: number) =>
                Array.from({ length: count }, (_, i) => ({ EventId: `ok-${i}` }));

            it('throws with the original index as the id when a single chunk has a rejection', async () => {
                rejectedChunks([
                    { EventId: 'ok-0' },
                    { ErrorCode: 'InternalFailure', ErrorMessage: 'Boom' },
                    { EventId: 'ok-2' },
                ]);

                const error = await batchFailure(service().putEvents({ Entries: entries(3) }));

                expect(error.failed).toEqual([
                    { id: '1', code: 'InternalFailure', message: 'Boom' },
                ]);
            });

            it('offsets the id by the chunk position across chunk boundaries', async () => {
                rejectedChunks(
                    [{ ErrorCode: 'InternalFailure', ErrorMessage: 'first' }, ...accepted(9)],
                    [
                        ...accepted(3),
                        { ErrorCode: 'ThrottlingException', ErrorMessage: 'second' },
                        ...accepted(6),
                    ],
                    [...accepted(2), { ErrorCode: 'InternalFailure', ErrorMessage: 'third' }]
                );

                const error = await batchFailure(service().putEvents({ Entries: entries(23) }));

                expect(error.failed.map(({ id, message }) => ({ id, message }))).toEqual([
                    { id: '0', message: 'first' },
                    { id: '13', message: 'second' },
                    { id: '22', message: 'third' },
                ]);
            });

            it('sends every chunk before throwing and preserves all per-chunk results', async () => {
                rejectedChunks(
                    [{ ErrorCode: 'InternalFailure', ErrorMessage: 'Boom' }, ...accepted(9)],
                    accepted(10),
                    accepted(3)
                );

                const error = await batchFailure(service().putEvents({ Entries: entries(23) }));

                expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(3);
                expect(error.results).toHaveLength(3);
            });

            it('recognises a rejection by its error code, not by a missing event id', async () => {
                rejectedChunks([
                    { ErrorCode: 'InternalFailure', ErrorMessage: 'has an id too', EventId: 'e-1' },
                    {},
                ]);

                const error = await batchFailure(service().putEvents({ Entries: entries(2) }));

                expect(error.failed).toEqual([
                    { id: '0', code: 'InternalFailure', message: 'has an id too' },
                ]);
            });

            it('lets request-level SDK exceptions propagate unwrapped and stops processing', async () => {
                eventBridgeMock.on(PutEventsCommand).rejects(new Error('Rate exceeded'));

                const outcome = service().putEvents({ Entries: entries(23) });

                await expect(outcome).rejects.toThrow('Rate exceeded');
                await expect(outcome).rejects.not.toBeInstanceOf(BatchOperationError);
                expect(eventBridgeMock.commandCalls(PutEventsCommand)).toHaveLength(1);
            });

            it('never carries the request event detail on the error or in the warning', async () => {
                const sentinel = 'detail-sentinel-7f3a';
                rejectedChunks([{ ErrorCode: 'InternalFailure', ErrorMessage: 'Boom' }]);
                const logger = new Logger();
                logger.setLogLevel('INFO');
                const warnSpy = vi.spyOn(logger, 'warn');
                const failing = new EventBridgeService({
                    client: new EventBridgeClient({}),
                    logger,
                });

                const error = await batchFailure(
                    failing.putEvents({
                        Entries: [
                            {
                                Source: 'test.source',
                                DetailType: 'TestEvent',
                                Detail: JSON.stringify({ secret: sentinel }),
                            },
                        ],
                    })
                );

                expect(error.message).not.toContain(sentinel);
                expect(JSON.stringify({ ...error })).not.toContain(sentinel);
                expect(warnSpy).toHaveBeenCalledTimes(1);
                const [message, payload] = warnSpy.mock.calls[0] ?? [];
                expect(`${message}${JSON.stringify(payload)}`).not.toContain(sentinel);
                expect(payload).toEqual({ failedCount: 1, codes: ['InternalFailure'] });
            });
        });

        it('logs only the endpoint id and entry count at INFO level', async () => {
            eventBridgeMock.on(PutEventsCommand).resolves({ FailedEntryCount: 0, Entries: [] });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const logged = new EventBridgeService({ client: new EventBridgeClient({}), logger });

            await logged.putEvents({
                EndpointId,
                Entries: [
                    {
                        Source: 'test.source',
                        DetailType: 'TestEvent',
                        Detail: '{"secret":"shh"}',
                        Resources: ['arn:aws:s3:::bucket'],
                    },
                ],
            });

            expect(infoSpy).toHaveBeenCalledTimes(1);
            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).not.toHaveProperty('Entries');
            expect(loggedInput).not.toHaveProperty('Detail');
            expect(loggedInput).toEqual({ EndpointId, entryCount: 1 });
        });
    });
});
