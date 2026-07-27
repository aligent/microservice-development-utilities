import {
    DeleteObjectCommand,
    GetObjectCommand,
    GetObjectCommandInput,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import hash from 'object-hash';
import chunkBy from '../chunk-by/chunk-by';

/**
 * A data access object for an S3 bucket
 *
 * @deprecated Superseded by `S3Service` in `@aligent/aws-wrappers`, which adds
 * Powertools logging and X-Ray tracing, and takes the bucket per-call rather
 * than per-instance.
 *
 * ```ts
 * // Before
 * const dao = new S3Dao('my-bucket');
 * const object = await dao.storeData(payload);
 * const data = await dao.fetchData(object);
 *
 * // After
 * const s3 = new S3Service();
 * await s3.putJsonObject({ Bucket: 'my-bucket', Key: key, Body: payload });
 * const data = await s3.getJsonObject({ Bucket: 'my-bucket', Key: key });
 * ```
 */
class S3Dao {
    private s3: S3Client;
    private bucket: string;

    /**
     * @param bucket the location of the bucket that objects should be stored in
     */
    constructor(bucket: string) {
        this.bucket = bucket;
        this.s3 = new S3Client({});
    }

    /**
     * Store data in an S3 bucket
     * @param data the data to store
     * @param name the name to call the object in S3 @default the hash of the data
     * @returns an object which can be used to fetch the data
     * @deprecated Use `S3Service#putJsonObject` from `@aligent/aws-wrappers` instead.
     * `Key` is required there — supply the `object-hash` value yourself if you
     * relied on the hashed default.
     */
    public async storeData<T>(data: T, name?: string): Promise<GetObjectCommandInput> {
        if (typeof data === 'undefined') {
            throw new Error('data is undefined');
        }

        const getObject: GetObjectCommandInput = {
            Bucket: this.bucket,
            Key: name || hash(data),
        };

        await this.s3.send(
            new PutObjectCommand({
                ...getObject,
                Body: JSON.stringify(data),
            })
        );

        return getObject;
    }

    /**
     * Store an array of object as individual chunks in S3
     * @param data the data to store
     * @param chunkSize the number of entries that should be in each chunk
     * @returns an array of objects which can be used to fetch the chunks
     * @deprecated No direct equivalent in `@aligent/aws-wrappers` — compose
     * `chunkBy` with `S3Service#putJsonObject`.
     */
    public async storeChunked<T extends unknown[]>(data: T, chunkSize: number) {
        const chunks = chunkBy(data, chunkSize);
        return Promise.all(chunks.map(chunk => this.storeData(chunk)));
    }

    /**
     * Fetch an object from the S3 bucket
     * @param objectDetails the object which describes the location of the object
     * @returns the body of the object
     * @deprecated Use `S3Service#getJsonObject` from `@aligent/aws-wrappers` instead.
     */
    public async fetchData<T>(objectDetails: GetObjectCommandInput): Promise<T> {
        const data = await this.s3.send(new GetObjectCommand(objectDetails));

        if (typeof data.Body === 'undefined') {
            throw new Error('body is undefined');
        }

        const body = await data.Body.transformToString();
        return JSON.parse(body);
    }

    /**
     * Generator to fetch chunked data, chunk by chunk
     * @param chunks the list of object chunks
     * @deprecated No direct equivalent in `@aligent/aws-wrappers` — iterate the
     * chunks yourself with `S3Service#getJsonObject`.
     */
    public async *fetchChunks<T>(chunks: GetObjectCommandInput[]) {
        for (let i = 0; i < chunks.length; i++) {
            const chunk: T = await this.fetchData<T>(chunks[i] as GetObjectCommandInput);

            const response = {
                chunk,
                s3Object: chunks[i],
            };

            yield response;
        }

        return null as T;
    }

    /**
     * Delete an object from the S3 bucket
     * @param objectDetails the object to delete
     * @deprecated Use `S3Service#deleteObject` from `@aligent/aws-wrappers` instead.
     */
    public async deleteData(objectDetails: GetObjectCommandInput) {
        return this.s3.send(new DeleteObjectCommand(objectDetails));
    }
}

export default S3Dao;
