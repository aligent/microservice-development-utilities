[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / S3Dao

# ~~Interface: S3Dao~~

Defined in: [packages/microservice-util-lib/src/s3/s3.ts:30](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/s3/s3.ts#L30)

A data access object for an S3 bucket

## Deprecated

Superseded by `S3Service` in `@aligent/aws-wrappers`, which adds
Powertools logging and X-Ray tracing, and takes the bucket per-call rather
than per-instance.

```ts
// Before
const dao = new S3Dao('my-bucket');
const object = await dao.storeData(payload);
const data = await dao.fetchData(object);

// After
const s3 = new S3Service();
await s3.putJsonObject({ Bucket: 'my-bucket', Key: key, Body: payload });
const data = await s3.getJsonObject({ Bucket: 'my-bucket', Key: key });
```

## Methods

<a id="deletedata"></a>

### ~~deleteData()~~

> **deleteData**(`objectDetails`): `Promise`\<`DeleteObjectCommandOutput`\>

Defined in: [packages/microservice-util-lib/src/s3/s3.ts:127](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/s3/s3.ts#L127)

Delete an object from the S3 bucket

#### Parameters

##### objectDetails

`GetObjectCommandInput`

the object to delete

#### Returns

`Promise`\<`DeleteObjectCommandOutput`\>

#### Deprecated

Use `S3Service#deleteObject` from `@aligent/aws-wrappers` instead.

***

<a id="fetchchunks"></a>

### ~~fetchChunks()~~

> **fetchChunks**\<`T`\>(`chunks`): `AsyncGenerator`\<\{ `chunk`: `T`; `s3Object`: `GetObjectCommandInput` \| `undefined`; \}, `Awaited`\<`T`\>, `unknown`\>

Defined in: [packages/microservice-util-lib/src/s3/s3.ts:107](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/s3/s3.ts#L107)

Generator to fetch chunked data, chunk by chunk

#### Type Parameters

##### T

`T`

#### Parameters

##### chunks

`GetObjectCommandInput`[]

the list of object chunks

#### Returns

`AsyncGenerator`\<\{ `chunk`: `T`; `s3Object`: `GetObjectCommandInput` \| `undefined`; \}, `Awaited`\<`T`\>, `unknown`\>

#### Deprecated

No direct equivalent in `@aligent/aws-wrappers` — iterate the
chunks yourself with `S3Service#getJsonObject`.

***

<a id="fetchdata"></a>

### ~~fetchData()~~

> **fetchData**\<`T`\>(`objectDetails`): `Promise`\<`T`\>

Defined in: [packages/microservice-util-lib/src/s3/s3.ts:90](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/s3/s3.ts#L90)

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

#### Deprecated

Use `S3Service#getJsonObject` from `@aligent/aws-wrappers` instead.

***

<a id="storechunked"></a>

### ~~storeChunked()~~

> **storeChunked**\<`T`\>(`data`, `chunkSize`): `Promise`\<`GetObjectCommandInput`[]\>

Defined in: [packages/microservice-util-lib/src/s3/s3.ts:79](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/s3/s3.ts#L79)

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

#### Deprecated

No direct equivalent in `@aligent/aws-wrappers` — compose
`chunkBy` with `S3Service#putJsonObject`.

***

<a id="storedata"></a>

### ~~storeData()~~

> **storeData**\<`T`\>(`data`, `name?`): `Promise`\<`GetObjectCommandInput`\>

Defined in: [packages/microservice-util-lib/src/s3/s3.ts:51](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/s3/s3.ts#L51)

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

#### Deprecated

Use `S3Service#putJsonObject` from `@aligent/aws-wrappers` instead.
`Key` is required there — supply the `object-hash` value yourself if you
relied on the hashed default.
