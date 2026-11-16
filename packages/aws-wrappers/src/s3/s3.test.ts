import { Logger } from '@aws-lambda-powertools/logger';
import {
    CopyObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    DeleteObjectsCommandOutput,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { sdkStreamMixin } from '@smithy/util-stream';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BatchOperationError } from '../util/batch-operation-error';
import { EmptyBucketPageResult, S3Service } from './s3';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vi.fn(),
}));

const s3Mock = mockClient(S3Client);
const Bucket = 'my-bucket';

const stringStream = (value: string) => {
    const stream = new Readable();
    stream.push(value);
    stream.push(null);
    return sdkStreamMixin(stream);
};

describe('S3Service', () => {
    afterEach(() => {
        s3Mock.reset();
    });

    it('constructs with default logger and client when no options supplied', () => {
        expect(() => new S3Service()).not.toThrow();
    });

    describe('put-method log shape', () => {
        const buildLoggedService = () => {
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new S3Service({ client: new S3Client({}), logger });
            return { service, infoSpy };
        };

        it('putObject omits Body from the INFO log', async () => {
            s3Mock.on(PutObjectCommand).resolves({});
            const { service, infoSpy } = buildLoggedService();

            await service.putObject({ Bucket, Key: 'k', Body: 'shh' });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).not.toHaveProperty('Body');
        });

        it('putJsonObject omits Body from the INFO log', async () => {
            s3Mock.on(PutObjectCommand).resolves({});
            const { service, infoSpy } = buildLoggedService();

            await service.putJsonObject({ Bucket, Key: 'k', Body: { secret: 'shh' } });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).not.toHaveProperty('Body');
        });
    });

    describe('putJsonObject / getJsonObject', () => {
        it('round-trips a JSON value', async () => {
            const payload = { foo: 'bar', count: 7 };
            s3Mock.on(PutObjectCommand).resolves({});
            s3Mock
                .on(GetObjectCommand, { Bucket, Key: 'data.json' })
                .resolves({ Body: stringStream(JSON.stringify(payload)) });
            const service = new S3Service({ client: new S3Client({}) });

            await service.putJsonObject({ Bucket, Key: 'data.json', Body: payload });
            const result = await service.getJsonObject<typeof payload>({
                Bucket,
                Key: 'data.json',
            });

            expect(result).toEqual(payload);
            const putCall = s3Mock.commandCalls(PutObjectCommand)[0];
            expect(putCall?.args[0].input.Body).toBe(JSON.stringify(payload));
        });

        it('returns undefined from getJsonObject when the response body is empty', async () => {
            s3Mock.on(GetObjectCommand).resolves({});
            const service = new S3Service({ client: new S3Client({}) });

            await expect(
                service.getJsonObject({ Bucket, Key: 'missing.json' })
            ).resolves.toBeUndefined();
        });
    });

    describe('deleteObjects', () => {
        it('chunks the request into batches of 1000 keys', async () => {
            s3Mock.on(DeleteObjectsCommand).resolves({});
            const keys = Array.from({ length: 2501 }, (_, i) => `key-${i}`);
            const service = new S3Service({ client: new S3Client({}) });

            await service.deleteObjects(Bucket, keys);

            const calls = s3Mock.commandCalls(DeleteObjectsCommand);
            const sentBatchSizes = calls.map(c => c.args[0].input.Delete?.Objects?.length);
            expect(sentBatchSizes).toEqual([1000, 1000, 501]);
        });

        it('makes no calls when the key list is empty', async () => {
            const service = new S3Service({ client: new S3Client({}) });

            await service.deleteObjects(Bucket, []);

            expect(s3Mock.commandCalls(DeleteObjectsCommand)).toHaveLength(0);
        });

        it('logs only bucket and keyCount at INFO level', async () => {
            s3Mock.on(DeleteObjectsCommand).resolves({});
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new S3Service({ client: new S3Client({}), logger });

            await service.deleteObjects(Bucket, ['k1', 'k2', 'k3']);

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).not.toHaveProperty('keys');
            expect(loggedInput).toMatchObject({ bucket: Bucket, keyCount: 3 });
        });

        describe('per-key delete errors', () => {
            const catchBatchError = async (promise: Promise<unknown>) => {
                const error = await promise.then(
                    () => undefined,
                    (thrown: unknown) => thrown
                );
                expect(error).toBeInstanceOf(BatchOperationError);
                return error as BatchOperationError<DeleteObjectsCommandOutput>;
            };

            it('returns the per-chunk outputs untouched when S3 reports an empty Errors list', async () => {
                const output = { Deleted: [{ Key: 'k1' }], Errors: [] };
                s3Mock.on(DeleteObjectsCommand).resolves(output);
                const service = new S3Service({ client: new S3Client({}) });

                await expect(service.deleteObjects(Bucket, ['k1'])).resolves.toEqual([output]);
            });

            it('throws with the failed key, code and message when one key fails in a single chunk', async () => {
                s3Mock.on(DeleteObjectsCommand).resolves({
                    Deleted: [{ Key: 'k1' }],
                    Errors: [{ Key: 'k2', Code: 'AccessDenied', Message: 'Access Denied' }],
                });
                const service = new S3Service({ client: new S3Client({}) });

                const error = await catchBatchError(service.deleteObjects(Bucket, ['k1', 'k2']));

                expect(error.failed).toEqual([
                    { id: 'k2', code: 'AccessDenied', message: 'Access Denied' },
                ]);
                expect(error.results).toEqual([
                    {
                        Deleted: [{ Key: 'k1' }],
                        Errors: [{ Key: 'k2', Code: 'AccessDenied', Message: 'Access Denied' }],
                    },
                ]);
            });

            it('attempts every chunk before throwing when failures land in different chunks', async () => {
                s3Mock
                    .on(DeleteObjectsCommand)
                    .resolvesOnce({ Errors: [{ Key: 'key-3', Code: 'InternalError' }] })
                    .resolvesOnce({})
                    .resolvesOnce({ Errors: [{ Key: 'key-2000', Code: 'AccessDenied' }] });
                const keys = Array.from({ length: 2001 }, (_, i) => `key-${i}`);
                const service = new S3Service({ client: new S3Client({}) });

                const error = await catchBatchError(service.deleteObjects(Bucket, keys));

                expect(s3Mock.commandCalls(DeleteObjectsCommand)).toHaveLength(3);
                expect(error.results).toHaveLength(3);
                expect(error.failed.map(entry => entry.id)).toEqual(['key-3', 'key-2000']);
            });

            it('reports every key when every key fails', async () => {
                s3Mock.on(DeleteObjectsCommand).resolves({
                    Errors: [
                        { Key: 'k1', Code: 'AccessDenied', Message: 'no' },
                        { Key: 'k2', Code: 'AccessDenied', Message: 'no' },
                    ],
                });
                const service = new S3Service({ client: new S3Client({}) });

                const error = await catchBatchError(service.deleteObjects(Bucket, ['k1', 'k2']));

                expect(error.failed.map(entry => entry.id)).toEqual(['k1', 'k2']);
                expect(error.message).toBe('Batch operation failed for 2 entries (AccessDenied)');
            });

            it('warns with the failure count and codes but no key at INFO level', async () => {
                s3Mock.on(DeleteObjectsCommand).resolves({
                    Errors: [
                        { Key: 'secret/customer-42.pdf', Code: 'AccessDenied', Message: 'no' },
                        { Key: 'secret/customer-43.pdf', Code: 'InternalError', Message: 'oops' },
                    ],
                });
                const logger = new Logger();
                logger.setLogLevel('INFO');
                const warnSpy = vi.spyOn(logger, 'warn');
                const service = new S3Service({ client: new S3Client({}), logger });

                await catchBatchError(
                    service.deleteObjects(Bucket, [
                        'secret/customer-42.pdf',
                        'secret/customer-43.pdf',
                    ])
                );

                expect(warnSpy).toHaveBeenCalledTimes(1);
                const [, payload] = warnSpy.mock.calls[0] ?? [];
                expect(payload).toEqual({
                    failedCount: 2,
                    codes: ['AccessDenied', 'InternalError'],
                });
            });

            it('propagates a request-level SDK exception unchanged and stops at that chunk', async () => {
                const denied = new Error('AccessDenied');
                s3Mock.on(DeleteObjectsCommand).rejects(denied);
                const keys = Array.from({ length: 1001 }, (_, i) => `key-${i}`);
                const service = new S3Service({ client: new S3Client({}) });

                await expect(service.deleteObjects(Bucket, keys)).rejects.toBe(denied);
                expect(s3Mock.commandCalls(DeleteObjectsCommand)).toHaveLength(1);
            });
        });
    });

    describe('emptyBucket', () => {
        it('streams the listing and deletes each page via deleteObjects', async () => {
            s3Mock
                .on(ListObjectsV2Command)
                .resolvesOnce({
                    Contents: [{ Key: 'a' }, { Key: 'b' }],
                    IsTruncated: true,
                    NextContinuationToken: 'tok',
                })
                .resolves({
                    Contents: [{ Key: 'c' }],
                    IsTruncated: false,
                });
            s3Mock.on(DeleteObjectsCommand).resolves({});
            const service = new S3Service({ client: new S3Client({}) });

            const deletedKeys = await service.emptyBucket(Bucket);

            expect(deletedKeys).toEqual(['a', 'b', 'c']);
            const deletedBatches = s3Mock
                .commandCalls(DeleteObjectsCommand)
                .map(c => c.args[0].input.Delete?.Objects?.map(o => o.Key));
            expect(deletedBatches).toEqual([['a', 'b'], ['c']]);
        });

        it('issues no DeleteObjects call when the bucket is already empty', async () => {
            s3Mock.on(ListObjectsV2Command).resolves({ Contents: [] });
            const service = new S3Service({ client: new S3Client({}) });

            await expect(service.emptyBucket(Bucket)).resolves.toEqual([]);
            expect(s3Mock.commandCalls(DeleteObjectsCommand)).toHaveLength(0);
        });

        describe('per-key delete errors', () => {
            const listThreePages = () =>
                s3Mock
                    .on(ListObjectsV2Command)
                    .resolvesOnce({
                        Contents: [{ Key: 'a' }, { Key: 'b' }],
                        IsTruncated: true,
                        NextContinuationToken: 'tok-1',
                    })
                    .resolvesOnce({
                        Contents: [{ Key: 'c' }],
                        IsTruncated: true,
                        NextContinuationToken: 'tok-2',
                    })
                    .resolves({ Contents: [{ Key: 'd' }, { Key: 'e' }], IsTruncated: false });

            const catchBatchError = async (promise: Promise<unknown>) => {
                const error = await promise.then(
                    () => undefined,
                    (thrown: unknown) => thrown
                );
                expect(error).toBeInstanceOf(BatchOperationError);
                return error as BatchOperationError<EmptyBucketPageResult>;
            };

            it('continues through every page and throws one aggregated error when only some pages fail', async () => {
                listThreePages();
                s3Mock
                    .on(DeleteObjectsCommand)
                    .resolvesOnce({ Errors: [{ Key: 'b', Code: 'AccessDenied', Message: 'no' }] })
                    .resolvesOnce({})
                    .resolvesOnce({
                        Errors: [
                            { Key: 'd', Code: 'InternalError', Message: 'oops' },
                            { Key: 'e', Code: 'InternalError', Message: 'oops' },
                        ],
                    });
                const service = new S3Service({ client: new S3Client({}) });

                const error = await catchBatchError(service.emptyBucket(Bucket));

                expect(s3Mock.commandCalls(ListObjectsV2Command)).toHaveLength(3);
                expect(s3Mock.commandCalls(DeleteObjectsCommand)).toHaveLength(3);
                expect(error.failed.map(entry => entry.id)).toEqual(['b', 'd', 'e']);
                expect(error.results.flatMap(page => page.deletedKeys)).toEqual(['a', 'c']);
                expect(error.message).toBe(
                    'Batch operation failed for 3 entries (AccessDenied, InternalError)'
                );
            });

            it('reports no deleted keys when every key fails', async () => {
                s3Mock
                    .on(ListObjectsV2Command)
                    .resolves({ Contents: [{ Key: 'a' }, { Key: 'b' }] });
                s3Mock.on(DeleteObjectsCommand).resolves({
                    Errors: [
                        { Key: 'a', Code: 'AccessDenied' },
                        { Key: 'b', Code: 'AccessDenied' },
                    ],
                });
                const service = new S3Service({ client: new S3Client({}) });

                const error = await catchBatchError(service.emptyBucket(Bucket));

                expect(error.results.flatMap(page => page.deletedKeys)).toEqual([]);
                expect(error.failed.map(entry => entry.id)).toEqual(['a', 'b']);
            });

            it('returns only keys S3 confirmed deleted when no key fails', async () => {
                listThreePages();
                s3Mock.on(DeleteObjectsCommand).resolves({ Errors: [] });
                const service = new S3Service({ client: new S3Client({}) });

                await expect(service.emptyBucket(Bucket)).resolves.toEqual([
                    'a',
                    'b',
                    'c',
                    'd',
                    'e',
                ]);
            });

            it('propagates a request-level SDK exception unchanged', async () => {
                const denied = new Error('AccessDenied');
                listThreePages();
                s3Mock.on(DeleteObjectsCommand).rejects(denied);
                const service = new S3Service({ client: new S3Client({}) });

                await expect(service.emptyBucket(Bucket)).rejects.toBe(denied);
                expect(s3Mock.commandCalls(ListObjectsV2Command)).toHaveLength(1);
            });
        });
    });

    describe('pass-through commands', () => {
        it('getObjectBody returns the body string', async () => {
            s3Mock.on(GetObjectCommand).resolves({ Body: stringStream('hello') });
            const service = new S3Service({ client: new S3Client({}) });

            await expect(service.getObjectBody({ Bucket, Key: 'k' })).resolves.toBe('hello');
        });

        it('headObject sends a HeadObjectCommand', async () => {
            s3Mock.on(HeadObjectCommand).resolves({ ContentLength: 1 });
            const service = new S3Service({ client: new S3Client({}) });

            await service.headObject({ Bucket, Key: 'k' });
            expect(s3Mock.commandCalls(HeadObjectCommand)).toHaveLength(1);
        });

        it('copyObject sends a CopyObjectCommand', async () => {
            s3Mock.on(CopyObjectCommand).resolves({});
            const service = new S3Service({ client: new S3Client({}) });

            await service.copyObject({ Bucket, Key: 'dest', CopySource: 'src/k' });
            expect(s3Mock.commandCalls(CopyObjectCommand)).toHaveLength(1);
        });

        it('deleteObject sends a DeleteObjectCommand', async () => {
            s3Mock.on(DeleteObjectCommand).resolves({});
            const service = new S3Service({ client: new S3Client({}) });

            await service.deleteObject({ Bucket, Key: 'k' });
            expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(1);
        });

        it('getAllObjects parses each body as JSON across pages', async () => {
            s3Mock
                .on(ListObjectsV2Command)
                .resolvesOnce({
                    Contents: [{ Key: 'a' }, { Key: 'b' }],
                    IsTruncated: true,
                    NextContinuationToken: 'tok',
                })
                .resolves({ Contents: [{ Key: 'c' }] });
            s3Mock
                .on(GetObjectCommand, { Bucket, Key: 'a' })
                .resolves({ Body: stringStream(JSON.stringify({ id: 1 })) });
            s3Mock
                .on(GetObjectCommand, { Bucket, Key: 'b' })
                .resolves({ Body: stringStream(JSON.stringify({ id: 2 })) });
            s3Mock
                .on(GetObjectCommand, { Bucket, Key: 'c' })
                .resolves({ Body: stringStream(JSON.stringify({ id: 3 })) });
            const service = new S3Service({ client: new S3Client({}) });

            const items = await service.getAllObjects<{ id: number }>(Bucket);

            expect(items.map(i => i.id)).toEqual([1, 2, 3]);
        });
    });

    describe('getPresignedUrl', () => {
        afterEach(() => {
            vi.mocked(getSignedUrl).mockReset();
        });

        it('returns a GET signed URL with attachment Content-Disposition', async () => {
            vi.mocked(getSignedUrl).mockResolvedValueOnce('https://signed/get');
            const service = new S3Service({ client: new S3Client({}) });

            const url = await service.getPresignedUrl({ Bucket, Key: 'k', action: 'get' });

            expect(url).toBe('https://signed/get');
            const [, command, opts] = vi.mocked(getSignedUrl).mock.calls[0] ?? [];
            expect(command).toBeInstanceOf(GetObjectCommand);
            expect((command as GetObjectCommand).input).toEqual({
                Bucket,
                Key: 'k',
                ResponseContentDisposition: 'attachment',
            });
            expect(opts?.expiresIn).toBe(3600);
        });

        it('returns a PUT signed URL without ResponseContentDisposition', async () => {
            vi.mocked(getSignedUrl).mockResolvedValueOnce('https://signed/put');
            const service = new S3Service({ client: new S3Client({}) });

            const url = await service.getPresignedUrl({ Bucket, Key: 'k', action: 'put' });

            expect(url).toBe('https://signed/put');
            const [, command] = vi.mocked(getSignedUrl).mock.calls[0] ?? [];
            expect(command).toBeInstanceOf(PutObjectCommand);
            expect((command as PutObjectCommand).input).toEqual({ Bucket, Key: 'k' });
        });

        it('forwards a custom expiresIn', async () => {
            vi.mocked(getSignedUrl).mockResolvedValueOnce('https://signed/custom');
            const service = new S3Service({ client: new S3Client({}) });

            await service.getPresignedUrl({ Bucket, Key: 'k', action: 'get', expiresIn: 120 });

            const [, , opts] = vi.mocked(getSignedUrl).mock.calls[0] ?? [];
            expect(opts?.expiresIn).toBe(120);
        });
    });

    describe('listObjects', () => {
        it('returns flat key list across pages', async () => {
            s3Mock
                .on(ListObjectsV2Command)
                .resolvesOnce({
                    Contents: [{ Key: 'a' }, { Key: 'b' }],
                    IsTruncated: true,
                    NextContinuationToken: 'tok',
                })
                .resolves({ Contents: [{ Key: 'c' }] });
            const service = new S3Service({ client: new S3Client({}) });

            await expect(service.listObjects(Bucket, 'prefix/')).resolves.toEqual(['a', 'b', 'c']);
        });
    });
});
