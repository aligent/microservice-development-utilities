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
