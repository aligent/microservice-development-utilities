import { GetObjectCommand, GetObjectCommandOutput, S3Client } from '@aws-sdk/client-s3';
import { sdkStreamMixin } from '@smithy/util-stream';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import S3Dao from './s3';

const s3Mock = mockClient(S3Client);

const Bucket = 'bucket_name';

beforeEach(() => {
    s3Mock.reset();
});

describe('fetchChunks', () => {
    it('should yield all file contents in a for await ... of loop ', async () => {
        const iterations = [0, 1, 2, 3];
        const chunks = iterations.map(n => ({
            Bucket,
            Key: `file_${n}`,
        }));
        const data = iterations.map(n => ({ value: n }));

        // Mocking response streams in S3 is a little involved
        // See documentation here: https://github.com/m-radzikowski/aws-sdk-client-mock#s3-getobjectcommand
        const responses = data.map(d => {
            const stream = new Readable();
            stream.push(JSON.stringify(d));
            stream.push(null);
            return { Body: sdkStreamMixin(stream) };
        });

        iterations.forEach(n => {
            s3Mock
                .on(GetObjectCommand, chunks[n])
                .resolvesOnce(responses[n] as GetObjectCommandOutput);
        });

        const s3 = new S3Dao(Bucket);

        const result = [];
        for await (const response of s3.fetchChunks(chunks)) {
            result.push(response.chunk);
        }

        expect(result).toEqual(data);
    });
});
