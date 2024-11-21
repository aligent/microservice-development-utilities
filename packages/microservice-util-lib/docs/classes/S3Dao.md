[**@aligent/microservice-util-lib**](../modules.md) • **Docs**

---

[@aligent/microservice-util-lib](../modules.md) / S3Dao

# Class: S3Dao

A data access object for an S3 bucket

## Constructors

<a id="constructors" name="constructors"></a>

### new S3Dao()

> **new S3Dao**(`bucket`): [`S3Dao`](S3Dao.md)

#### Parameters

• **bucket**: `string`

the location of the bucket that objects should be stored in

#### Returns

[`S3Dao`](S3Dao.md)

#### Defined in

[s3/s3.ts:19](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/s3/s3.ts#L19)

## Methods

<a id="deletedata" name="deletedata"></a>

### deleteData()

> **deleteData**(`objectDetails`): `Promise`\<`DeleteObjectCommandOutput`\>

Delete an object from the S3 bucket

#### Parameters

• **objectDetails**: `GetObjectCommandInput`

the object to delete

#### Returns

`Promise`\<`DeleteObjectCommandOutput`\>

#### Defined in

[s3/s3.ts:100](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/s3/s3.ts#L100)

---

<a id="fetchchunks" name="fetchchunks"></a>

### fetchChunks()

> **fetchChunks**\<`T`\>(`chunks`): `AsyncGenerator`\<`object`, `Awaited`\<`T`\>, `unknown`\>

Generator to fetch chunked data, chunk by chunk

#### Type Parameters

• **T**

#### Parameters

• **chunks**: `GetObjectCommandInput`[]

the list of object chunks

#### Returns

`AsyncGenerator`\<`object`, `Awaited`\<`T`\>, `unknown`\>

##### chunk

> **chunk**: `T`

##### s3Object

> **s3Object**: `undefined` \| `GetObjectCommandInput`

#### Defined in

[s3/s3.ts:81](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/s3/s3.ts#L81)

---

<a id="fetchdata" name="fetchdata"></a>

### fetchData()

> **fetchData**\<`T`\>(`objectDetails`): `Promise`\<`T`\>

Fetch an object from the S3 bucket

#### Type Parameters

• **T**

#### Parameters

• **objectDetails**: `GetObjectCommandInput`

the object which describes the location of the object

#### Returns

`Promise`\<`T`\>

the body of the object

#### Defined in

[s3/s3.ts:66](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/s3/s3.ts#L66)

---

<a id="storechunked" name="storechunked"></a>

### storeChunked()

> **storeChunked**\<`T`\>(`data`, `chunkSize`): `Promise`\<`GetObjectCommandInput`[]\>

Store an array of object as individual chunks in S3

#### Type Parameters

• **T** _extends_ `any`[]

#### Parameters

• **data**: `T`

the data to store

• **chunkSize**: `number`

the number of entries that should be in each chunk

#### Returns

`Promise`\<`GetObjectCommandInput`[]\>

an array of objects which can be used to fetch the chunks

#### Defined in

[s3/s3.ts:56](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/s3/s3.ts#L56)

---

<a id="storedata" name="storedata"></a>

### storeData()

> **storeData**\<`T`\>(`data`, `name`?): `Promise`\<`GetObjectCommandInput`\>

Store data in an S3 bucket

#### Type Parameters

• **T**

#### Parameters

• **data**: `T`

the data to store

• **name?**: `string`

the name to call the object in S3

#### Returns

`Promise`\<`GetObjectCommandInput`\>

an object which can be used to fetch the data

#### Default

```ts
the hash of the data
```

#### Defined in

[s3/s3.ts:30](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/s3/s3.ts#L30)
