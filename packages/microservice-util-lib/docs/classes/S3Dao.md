[@aligent/microservice-util-lib](../modules.md) / S3Dao

# Class: S3Dao

A data access object for an S3 bucket

## Table of contents

### Constructors

- [constructor](S3Dao.md#constructor)

### Properties

- [bucket](S3Dao.md#bucket)
- [s3](S3Dao.md#s3)

### Methods

- [deleteData](S3Dao.md#deletedata)
- [fetchChunks](S3Dao.md#fetchchunks)
- [fetchData](S3Dao.md#fetchdata)
- [storeChunked](S3Dao.md#storechunked)
- [storeData](S3Dao.md#storedata)

## Constructors

### <a id="constructor" name="constructor"></a> constructor

• **new S3Dao**(`bucket`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `bucket` | `string` | the location of the bucket that objects should be stored in |

#### Defined in

[s3/s3.ts:19](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/s3/s3.ts#lines-19)

## Properties

### <a id="bucket" name="bucket"></a> bucket

• `Private` **bucket**: `string`

#### Defined in

[s3/s3.ts:14](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/s3/s3.ts#lines-14)

___

### <a id="s3" name="s3"></a> s3

• `Private` **s3**: `S3Client`

#### Defined in

[s3/s3.ts:13](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/s3/s3.ts#lines-13)

## Methods

### <a id="deletedata" name="deletedata"></a> deleteData

▸ **deleteData**(`objectDetails`): `Promise`<`DeleteObjectCommandOutput`\>

Delete an object from the S3 bucket

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `objectDetails` | `GetObjectCommandInput` | the object to delete |

#### Returns

`Promise`<`DeleteObjectCommandOutput`\>

#### Defined in

[s3/s3.ts:96](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/s3/s3.ts#lines-96)

___

### <a id="fetchchunks" name="fetchchunks"></a> fetchChunks

▸ **fetchChunks**<`T`\>(`chunks`): `AsyncGenerator`<{ `chunk`: `T` ; `s3Object`: `GetObjectCommandInput`  }, `Awaited`<`T`\>, `unknown`\>

Generator to fetch chunked data, chunk by chunk

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `chunks` | `GetObjectCommandInput`[] | the list of object chunks |

#### Returns

`AsyncGenerator`<{ `chunk`: `T` ; `s3Object`: `GetObjectCommandInput`  }, `Awaited`<`T`\>, `unknown`\>

#### Defined in

[s3/s3.ts:77](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/s3/s3.ts#lines-77)

___

### <a id="fetchdata" name="fetchdata"></a> fetchData

▸ **fetchData**<`T`\>(`objectDetails`): `Promise`<`T`\>

Fetch an object from the S3 bucket

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `objectDetails` | `GetObjectCommandInput` | the object which describes the location of the object |

#### Returns

`Promise`<`T`\>

the body of the object

#### Defined in

[s3/s3.ts:67](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/s3/s3.ts#lines-67)

___

### <a id="storechunked" name="storechunked"></a> storeChunked

▸ **storeChunked**<`T`\>(`data`, `chunkSize`): `Promise`<`GetObjectCommandInput`[]\>

Store an array of object as individual chunks in S3

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `any`[] |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `data` | `T` | the data to store |
| `chunkSize` | `number` | the number of entries that should be in each chunk |

#### Returns

`Promise`<`GetObjectCommandInput`[]\>

an array of objects which can be used to fetch the chunks

#### Defined in

[s3/s3.ts:57](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/s3/s3.ts#lines-57)

___

### <a id="storedata" name="storedata"></a> storeData

▸ **storeData**<`T`\>(`data`, `name?`): `Promise`<`GetObjectCommandInput`\>

Store data in an S3 bucket

**`Default`**

the hash of the data

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `data` | `T` | the data to store |
| `name?` | `string` | the name to call the object in S3 |

#### Returns

`Promise`<`GetObjectCommandInput`\>

an object which can be used to fetch the data

#### Defined in

[s3/s3.ts:30](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/s3/s3.ts#lines-30)
