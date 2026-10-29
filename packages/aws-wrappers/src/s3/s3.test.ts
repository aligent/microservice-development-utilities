import { Logger } from '@aws-lambda-powertools/logger';
import {
    CopyObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
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
import { BatchOperationError } from '../util/batch-operation-error.js';
import { batchFailure } from '../util/batch-operation-error.test-helpers.js';
import { S3Service } from './s3';

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

        it('does not request Quiet mode', async () => {
            s3Mock.on(DeleteObjectsCommand).resolves({});
            const service = new S3Service({ client: new S3Client({}) });

            await service.deleteObjects(Bucket, ['k1']);

            const [call] = s3Mock.commandCalls(DeleteObjectsCommand);
            expect(call?.args[0].input.Delete?.Quiet).toBeUndefined();
        });

        describe('partial failure', () => {
            const service = () => new S3Service({ client: new S3Client({}) });
            const keys = (count: number) => Array.from({ length: count }, (_, i) => `key-${i}`);

            it('throws with the failed key, code and message when one key in a chunk is rejected', async () => {
                s3Mock.on(DeleteObjectsCommand).resolves({
                    Deleted: [{ Key: 'key-0' }, { Key: 'key-2' }],
                    Errors: [
                        {
                            Key: 'key-1',
                            VersionId: 'v-1',
                            Code: 'AccessDenied',
                            Message: 'Access Denied',
                        },
                    ],
                });

                const error = await batchFailure(service().deleteObjects(Bucket, keys(3)));

                expect(error.failed).toEqual([
                    { id: 'key-1', code: 'AccessDenied', message: 'Access Denied' },
                ]);
                expect(error.results).toHaveLength(1);
            });

            it('sends every chunk before throwing and reports failures from each chunk', async () => {
                s3Mock
                    .on(DeleteObjectsCommand)
                    .resolvesOnce({
                        Errors: [{ Key: 'key-5', Code: 'InternalError', Message: 'first' }],
                    })
                    .resolvesOnce({})
                    .resolvesOnce({
                        Errors: [{ Key: 'key-2500', Code: 'AccessDenied', Message: 'third' }],
                    });

                const error = await batchFailure(service().deleteObjects(Bucket, keys(2501)));

                expect(s3Mock.commandCalls(DeleteObjectsCommand)).toHaveLength(3);
                expect(error.results).toHaveLength(3);
                expect(error.failed.map(({ id }) => id)).toEqual(['key-5', 'key-2500']);
            });

            it('reports every key when a whole chunk is rejected', async () => {
                s3Mock.on(DeleteObjectsCommand).resolves({
                    Errors: keys(3).map(Key => ({ Key, Code: 'AccessDenied', Message: 'nope' })),
                });

                const error = await batchFailure(service().deleteObjects(Bucket, keys(3)));

                expect(error.failed.map(({ id }) => id)).toEqual(keys(3));
            });

            it('returns the per-chunk outputs unchanged when no key is rejected', async () => {
                const output = { Deleted: [{ Key: 'key-0' }], Errors: [] };
                s3Mock.on(DeleteObjectsCommand).resolves(output);

                const results = await service().deleteObjects(Bucket, keys(1));

                expect(results).toEqual([expect.objectContaining(output)]);
            });

            it('lets request-level SDK exceptions propagate unwrapped and stops processing', async () => {
                s3Mock.on(DeleteObjectsCommand).rejects(new Error('SlowDown'));

                const outcome = service().deleteObjects(Bucket, keys(2501));

                await expect(outcome).rejects.toThrow('SlowDown');
                await expect(outcome).rejects.not.toBeInstanceOf(BatchOperationError);
                expect(s3Mock.commandCalls(DeleteObjectsCommand)).toHaveLength(1);
            });

            it('warns with the failure count and codes but never the keys', async () => {
                const sentinel = 'customer-key-7f3a';
                s3Mock.on(DeleteObjectsCommand).resolves({
                    Errors: [{ Key: sentinel, Code: 'AccessDenied', Message: 'Access Denied' }],
                });
                const logger = new Logger();
                logger.setLogLevel('INFO');
                const warnSpy = vi.spyOn(logger, 'warn');
                const failing = new S3Service({ client: new S3Client({}), logger });

                const error = await batchFailure(failing.deleteObjects(Bucket, [sentinel]));

                expect(error.message).not.toContain(sentinel);
                expect(warnSpy).toHaveBeenCalledTimes(1);
                const [message, payload] = warnSpy.mock.calls[0] ?? [];
                expect(`${message}${JSON.stringify(payload)}`).not.toContain(sentinel);
                expect(payload).toEqual({ failedCount: 1, codes: ['AccessDenied'] });
            });
        });
    });

    describe('emptyBucket', () => {
        const listTwoPages = () =>
            s3Mock
                .on(ListObjectsV2Command)
                .resolvesOnce({
                    Contents: [{ Key: 'a' }, { Key: 'b' }],
                    IsTruncated: true,
                    NextContinuationToken: 'tok',
                })
                .resolves({ Contents: [{ Key: 'c' }], IsTruncated: false });

        it('sends its deletes in Quiet mode', async () => {
            listTwoPages();
            s3Mock.on(DeleteObjectsCommand).resolves({});
            const service = new S3Service({ client: new S3Client({}) });

            await service.emptyBucket(Bucket);

            const quietFlags = s3Mock
                .commandCalls(DeleteObjectsCommand)
                .map(c => c.args[0].input.Delete?.Quiet);
            expect(quietFlags).toEqual([true, true]);
        });

        it('deletes every page after a failure, then throws once covering all pages', async () => {
            listTwoPages();
            s3Mock
                .on(DeleteObjectsCommand)
                .resolvesOnce({ Errors: [{ Key: 'b', Code: 'AccessDenied', Message: 'first' }] })
                .resolvesOnce({ Errors: [{ Key: 'c', Code: 'InternalError', Message: 'second' }] });
            const logger = new Logger();
            const warnSpy = vi.spyOn(logger, 'warn');
            const service = new S3Service({ client: new S3Client({}), logger });

            const outcome = service.emptyBucket(Bucket);

            await expect(outcome).rejects.toBeInstanceOf(BatchOperationError);
            await expect(outcome).rejects.toMatchObject({
                failed: [
                    { id: 'b', code: 'AccessDenied', message: 'first' },
                    { id: 'c', code: 'InternalError', message: 'second' },
                ],
            });
            const deletedBatches = s3Mock
                .commandCalls(DeleteObjectsCommand)
                .map(c => c.args[0].input.Delete?.Objects?.map(o => o.Key));
            expect(deletedBatches).toEqual([['a', 'b'], ['c']]);
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        it('lets a request-level SDK exception while listing propagate unwrapped', async () => {
            s3Mock.on(ListObjectsV2Command).rejects(new Error('AccessDenied'));
            const service = new S3Service({ client: new S3Client({}) });

            const outcome = service.emptyBucket(Bucket);

            await expect(outcome).rejects.toThrow('AccessDenied');
            await expect(outcome).rejects.not.toBeInstanceOf(BatchOperationError);
            expect(s3Mock.commandCalls(DeleteObjectsCommand)).toHaveLength(0);
        });

        it('lets a request-level SDK exception while deleting propagate unwrapped', async () => {
            listTwoPages();
            s3Mock.on(DeleteObjectsCommand).rejects(new Error('SlowDown'));
            const service = new S3Service({ client: new S3Client({}) });

            const outcome = service.emptyBucket(Bucket);

            await expect(outcome).rejects.toThrow('SlowDown');
            await expect(outcome).rejects.not.toBeInstanceOf(BatchOperationError);
        });

        it('streams the listing and deletes each page', async () => {
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
