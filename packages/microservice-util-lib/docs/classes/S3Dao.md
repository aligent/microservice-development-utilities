[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / S3Dao

# Class: S3Dao

Defined in: [s3/s3.ts:12](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/s3/s3.ts#L12)

A data access object for an S3 bucket

## Constructors

<a id="constructor"></a>

### Constructor

> **new S3Dao**(`bucket`): `S3Dao`

Defined in: [s3/s3.ts:19](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/s3/s3.ts#L19)

#### Parameters

##### bucket

`string`

the location of the bucket that objects should be stored in

#### Returns

`S3Dao`

## Methods

<a id="deletedata"></a>

### deleteData()

> **deleteData**(`objectDetails`): `Promise`\<`DeleteObjectCommandOutput`\>

Defined in: [s3/s3.ts:100](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/s3/s3.ts#L100)

Delete an object from the S3 bucket

#### Parameters

##### objectDetails

`GetObjectCommandInput`

the object to delete

#### Returns

`Promise`\<`DeleteObjectCommandOutput`\>

***

<a id="fetchchunks"></a>

### fetchChunks()

> **fetchChunks**\<`T`\>(`chunks`): `AsyncGenerator`\<\{ `chunk`: `T`; `s3Object`: `undefined` \| `GetObjectCommandInput`; \}, `Awaited`\<`T`\>, `unknown`\>

Defined in: [s3/s3.ts:81](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/s3/s3.ts#L81)

Generator to fetch chunked data, chunk by chunk

#### Type Parameters

##### T

`T`

#### Parameters

##### chunks

`GetObjectCommandInput`[]

the list of object chunks

#### Returns

`AsyncGenerator`\<\{ `chunk`: `T`; `s3Object`: `undefined` \| `GetObjectCommandInput`; \}, `Awaited`\<`T`\>, `unknown`\>

***

<a id="fetchdata"></a>

### fetchData()

> **fetchData**\<`T`\>(`objectDetails`): `Promise`\<`T`\>

Defined in: [s3/s3.ts:66](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/s3/s3.ts#L66)

Fetch an object from the S3 bucket

#### Type Parameters

##### T

`T`

#### Parameters

##### objectDetails

`GetObjectCommandInput`

the object which describes the location of the object

#### Returns

`Promise`\<`T`\>

the body of the object

***

<a id="storechunked"></a>

### storeChunked()

> **storeChunked**\<`T`\>(`data`, `chunkSize`): `Promise`\<`GetObjectCommandInput`[]\>

Defined in: [s3/s3.ts:56](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/s3/s3.ts#L56)

Store an array of object as individual chunks in S3

#### Type Parameters

##### T

`T` *extends* `unknown`[]

#### Parameters

##### data

`T`

the data to store

##### chunkSize

`number`

the number of entries that should be in each chunk

#### Returns

`Promise`\<`GetObjectCommandInput`[]\>

an array of objects which can be used to fetch the chunks

***

<a id="storedata"></a>

### storeData()

> **storeData**\<`T`\>(`data`, `name`?): `Promise`\<`GetObjectCommandInput`\>

Defined in: [s3/s3.ts:30](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/s3/s3.ts#L30)

Store data in an S3 bucket

#### Type Parameters

##### T

`T`

#### Parameters

##### data

`T`

the data to store

##### name?

`string`

the name to call the object in S3

#### Returns

`Promise`\<`GetObjectCommandInput`\>

an object which can be used to fetch the data

#### Default

```ts
the hash of the data
```
