import {
    DeleteObjectsCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@smithy/util-stream';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import { afterEach, describe, expect, it } from 'vitest';
import { S3Service } from './s3';

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
        it('iterates the listing paginator and deletes each page', async () => {
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
            expect(s3Mock.commandCalls(DeleteObjectsCommand)).toHaveLength(2);
            const deletedBatches = s3Mock
                .commandCalls(DeleteObjectsCommand)
                .map(c => c.args[0].input.Delete?.Objects?.map(o => o.Key));
            expect(deletedBatches).toEqual([['a', 'b'], ['c']]);
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
