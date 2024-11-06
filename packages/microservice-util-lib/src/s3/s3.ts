import {
    DeleteObjectCommand,
    GetObjectCommand,
    GetObjectCommandInput,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import hash from 'object-hash';
import chunkBy from '../chunk/chunk.js';

/** A data access object for an S3 bucket */
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
     */
    public async storeData<T>(data: T, name?: string): Promise<GetObjectCommandInput> {
        if (typeof data === 'undefined') {
            throw new Error('data is undefined');
        }

        const getObject: GetObjectCommandInput = {
            Bucket: this.bucket,
            Key: name || hash(data as any),
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
     */
    public async storeChunked<T extends any[]>(data: T, chunkSize: number) {
        const chunks = chunkBy(data, chunkSize);
        return Promise.all(chunks.map(chunk => this.storeData(chunk)));
    }

    /**
     * Fetch an object from the S3 bucket
     * @param objectDetails the object which describes the location of the object
     * @returns the body of the object
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
     */
    public async deleteData(objectDetails: GetObjectCommandInput) {
        return this.s3.send(new DeleteObjectCommand(objectDetails));
    }
}

export default S3Dao;
