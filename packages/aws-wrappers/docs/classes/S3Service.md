[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / S3Service

# Class: S3Service

Defined in: [s3/s3.ts:35](https://github.com/aligent/microservice-development-utilities/blob/6924d054bf3a8807f88cfdec9873c27cdf46d64a/packages/aws-wrappers/src/s3/s3.ts#L35)

Wrapper around the AWS S3 client providing structured Powertools logging
and X-Ray tracing by default.

Input shapes are intentionally tight (Bucket/Key/Body only). Callers
needing SDK-level options not exposed here (server-side encryption,
tagging, version IDs) should use `S3Client` directly.

## Constructors

<a id="constructor"></a>

### Constructor

> **new S3Service**(`opts?`): `S3Service`

Defined in: [s3/s3.ts:45](https://github.com/aligent/microservice-development-utilities/blob/6924d054bf3a8807f88cfdec9873c27cdf46d64a/packages/aws-wrappers/src/s3/s3.ts#L45)

#### Parameters

##### opts?

###### client?

`S3Client`

Optional pre-configured `S3Client`. When supplied,
the wrapper does not apply X-Ray instrumentation.

###### logger?

`Logger`

Optional Powertools logger. Defaults to a logger with
`serviceName: 'S3Service'`.

#### Returns

`S3Service`

## Methods

<a id="copyobject"></a>

### copyObject()

> **copyObject**(`input`): `Promise`\<`CopyObjectCommandOutput`\>

Defined in: [s3/s3.ts:131](https://github.com/aligent/microservice-development-utilities/blob/6924d054bf3a8807f88cfdec9873c27cdf46d64a/packages/aws-wrappers/src/s3/s3.ts#L131)

Copy an object within S3.

#### Parameters

##### input

`Required`\<`Pick`\<`CopyObjectCommandInput`, `"Bucket"` \| `"Key"` \| `"CopySource"`\>\>

#### Returns

`Promise`\<`CopyObjectCommandOutput`\>

***

<a id="deleteobject"></a>

### deleteObject()

> **deleteObject**(`input`): `Promise`\<`DeleteObjectCommandOutput`\>

Defined in: [s3/s3.ts:185](https://github.com/aligent/microservice-development-utilities/blob/6924d054bf3a8807f88cfdec9873c27cdf46d64a/packages/aws-wrappers/src/s3/s3.ts#L185)

Delete a single object from S3.

#### Parameters

##### input

`Required`\<`Pick`\<`DeleteObjectCommandInput`, `"Bucket"` \| `"Key"`\>\>

#### Returns

`Promise`\<`DeleteObjectCommandOutput`\>

***

<a id="deleteobjects"></a>

### deleteObjects()

> **deleteObjects**(`bucket`, `keys`): `Promise`\<`DeleteObjectsCommandOutput`[]\>

Defined in: [s3/s3.ts:197](https://github.com/aligent/microservice-development-utilities/blob/6924d054bf3a8807f88cfdec9873c27cdf46d64a/packages/aws-wrappers/src/s3/s3.ts#L197)

Delete multiple objects from S3, auto-chunking the request into batches
of 1000 keys (the S3-enforced DeleteObjects limit). Returns one output
per chunk.

#### Parameters

##### bucket

`string`

##### keys

`string`[]

#### Returns

`Promise`\<`DeleteObjectsCommandOutput`[]\>

***

<a id="emptybucket"></a>

### emptyBucket()

> **emptyBucket**(`bucket`): `Promise`\<`string`[]\>

Defined in: [s3/s3.ts:220](https://github.com/aligent/microservice-development-utilities/blob/6924d054bf3a8807f88cfdec9873c27cdf46d64a/packages/aws-wrappers/src/s3/s3.ts#L220)

Delete every object in a bucket, paginating through the listing and
issuing one DeleteObjects request per page (respecting the 1000-key
batch limit).

#### Parameters

##### bucket

`string`

#### Returns

`Promise`\<`string`[]\>

The keys of every deleted object.

***

<a id="getallobjects"></a>

### getAllObjects()

> **getAllObjects**\<`T`\>(`bucket`, `prefix?`): `Promise`\<`T`[]\>

Defined in: [s3/s3.ts:162](https://github.com/aligent/microservice-development-utilities/blob/6924d054bf3a8807f88cfdec9873c27cdf46d64a/packages/aws-wrappers/src/s3/s3.ts#L162)

List and JSON-parse every object under a bucket and optional prefix.
Auto-paginated. Objects without a body are skipped.

#### Type Parameters

##### T

`T`

Expected type of each parsed object.

#### Parameters

##### bucket

`string`

##### prefix?

`string`

#### Returns

`Promise`\<`T`[]\>

***

<a id="getjsonobject"></a>

### getJsonObject()

> **getJsonObject**\<`T`\>(`input`): `Promise`\<`T` \| `undefined`\>

Defined in: [s3/s3.ts:111](https://github.com/aligent/microservice-development-utilities/blob/6924d054bf3a8807f88cfdec9873c27cdf46d64a/packages/aws-wrappers/src/s3/s3.ts#L111)

Get an object from S3 and parse it as JSON.

#### Type Parameters

##### T

`T`

Expected type of the parsed value.

#### Parameters

##### input

`Required`\<`Pick`\<`GetObjectCommandInput`, `"Bucket"` \| `"Key"`\>\>

#### Returns

`Promise`\<`T` \| `undefined`\>

The parsed value, or `undefined` if the response has no body.

***

<a id="getobject"></a>

### getObject()

> **getObject**(`input`): `Promise`\<`GetObjectCommandOutput`\>

Defined in: [s3/s3.ts:87](https://github.com/aligent/microservice-development-utilities/blob/6924d054bf3a8807f88cfdec9873c27cdf46d64a/packages/aws-wrappers/src/s3/s3.ts#L87)

Get an object from S3.

#### Parameters

##### input

`Required`\<`Pick`\<`GetObjectCommandInput`, `"Bucket"` \| `"Key"`\>\>

#### Returns

`Promise`\<`GetObjectCommandOutput`\>

***

<a id="getobjectbody"></a>

### getObjectBody()

> **getObjectBody**(`input`): `Promise`\<`string` \| `undefined`\>

Defined in: [s3/s3.ts:99](https://github.com/aligent/microservice-development-utilities/blob/6924d054bf3a8807f88cfdec9873c27cdf46d64a/packages/aws-wrappers/src/s3/s3.ts#L99)

Get an object from S3 and return its body as a string.

#### Parameters

##### input

`Required`\<`Pick`\<`GetObjectCommandInput`, `"Bucket"` \| `"Key"`\>\>

#### Returns

`Promise`\<`string` \| `undefined`\>

The object body as a string, or `undefined` if the response
has no body.

***

<a id="headobject"></a>

### headObject()

> **headObject**(`input`): `Promise`\<`HeadObjectCommandOutput`\>

Defined in: [s3/s3.ts:121](https://github.com/aligent/microservice-development-utilities/blob/6924d054bf3a8807f88cfdec9873c27cdf46d64a/packages/aws-wrappers/src/s3/s3.ts#L121)

Fetch the metadata for an S3 object without downloading its body.

#### Parameters

##### input

`Required`\<`Pick`\<`HeadObjectCommandInput`, `"Bucket"` \| `"Key"`\>\>

#### Returns

`Promise`\<`HeadObjectCommandOutput`\>

***

<a id="listobjects"></a>

### listObjects()

> **listObjects**(`bucket`, `prefix?`): `Promise`\<`string`[]\>

Defined in: [s3/s3.ts:142](https://github.com/aligent/microservice-development-utilities/blob/6924d054bf3a8807f88cfdec9873c27cdf46d64a/packages/aws-wrappers/src/s3/s3.ts#L142)

List object keys under a bucket and optional prefix, auto-paginating
across all pages.

#### Parameters

##### bucket

`string`

##### prefix?

`string`

#### Returns

`Promise`\<`string`[]\>

***

<a id="putjsonobject"></a>

### putJsonObject()

> **putJsonObject**\<`T`\>(`input`): `Promise`\<`PutObjectCommandOutput`\>

Defined in: [s3/s3.ts:65](https://github.com/aligent/microservice-development-utilities/blob/6924d054bf3a8807f88cfdec9873c27cdf46d64a/packages/aws-wrappers/src/s3/s3.ts#L65)

Serialise a value to JSON and store it as an S3 object.

#### Type Parameters

##### T

`T`

Type of the value being stored.

#### Parameters

##### input

###### Body

`T`

###### Bucket

`string`

###### Key

`string`

###### Metadata?

`Record`\<`string`, `string`\>

#### Returns

`Promise`\<`PutObjectCommandOutput`\>

***

<a id="putobject"></a>

### putObject()

> **putObject**(`input`): `Promise`\<`PutObjectCommandOutput`\>

Defined in: [s3/s3.ts:54](https://github.com/aligent/microservice-development-utilities/blob/6924d054bf3a8807f88cfdec9873c27cdf46d64a/packages/aws-wrappers/src/s3/s3.ts#L54)

Put an object into S3.

#### Parameters

##### input

`Required`\<`Pick`\<`PutObjectCommandInput`, `"Bucket"` \| `"Key"` \| `"Body"`\>\>

Bucket, Key, and Body of the object to store.

#### Returns

`Promise`\<`PutObjectCommandOutput`\>
