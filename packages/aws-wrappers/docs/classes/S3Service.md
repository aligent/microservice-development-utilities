[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / S3Service

# Class: S3Service

Defined in: [s3/s3.ts:35](https://github.com/aligent/microservice-development-utilities/blob/e58a12bb918948eafece9e076fa6bb937e23b418/packages/aws-wrappers/src/s3/s3.ts#L35)

Wrapper around the AWS S3 client providing structured Powertools logging
and X-Ray tracing by default.

Input shapes are intentionally tight (Bucket/Key/Body only). Callers
needing SDK-level options not exposed here (server-side encryption,
tagging, version IDs) should use `S3Client` directly.

## Constructors

<a id="constructor"></a>

### Constructor

> **new S3Service**(`opts?`): `S3Service`

Defined in: [s3/s3.ts:45](https://github.com/aligent/microservice-development-utilities/blob/e58a12bb918948eafece9e076fa6bb937e23b418/packages/aws-wrappers/src/s3/s3.ts#L45)

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

Defined in: [s3/s3.ts:144](https://github.com/aligent/microservice-development-utilities/blob/e58a12bb918948eafece9e076fa6bb937e23b418/packages/aws-wrappers/src/s3/s3.ts#L144)

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

Defined in: [s3/s3.ts:198](https://github.com/aligent/microservice-development-utilities/blob/e58a12bb918948eafece9e076fa6bb937e23b418/packages/aws-wrappers/src/s3/s3.ts#L198)

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

Defined in: [s3/s3.ts:210](https://github.com/aligent/microservice-development-utilities/blob/e58a12bb918948eafece9e076fa6bb937e23b418/packages/aws-wrappers/src/s3/s3.ts#L210)

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

Defined in: [s3/s3.ts:233](https://github.com/aligent/microservice-development-utilities/blob/e58a12bb918948eafece9e076fa6bb937e23b418/packages/aws-wrappers/src/s3/s3.ts#L233)

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

Defined in: [s3/s3.ts:175](https://github.com/aligent/microservice-development-utilities/blob/e58a12bb918948eafece9e076fa6bb937e23b418/packages/aws-wrappers/src/s3/s3.ts#L175)

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

Defined in: [s3/s3.ts:122](https://github.com/aligent/microservice-development-utilities/blob/e58a12bb918948eafece9e076fa6bb937e23b418/packages/aws-wrappers/src/s3/s3.ts#L122)

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

Defined in: [s3/s3.ts:97](https://github.com/aligent/microservice-development-utilities/blob/e58a12bb918948eafece9e076fa6bb937e23b418/packages/aws-wrappers/src/s3/s3.ts#L97)

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

Defined in: [s3/s3.ts:109](https://github.com/aligent/microservice-development-utilities/blob/e58a12bb918948eafece9e076fa6bb937e23b418/packages/aws-wrappers/src/s3/s3.ts#L109)

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

Defined in: [s3/s3.ts:134](https://github.com/aligent/microservice-development-utilities/blob/e58a12bb918948eafece9e076fa6bb937e23b418/packages/aws-wrappers/src/s3/s3.ts#L134)

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

Defined in: [s3/s3.ts:155](https://github.com/aligent/microservice-development-utilities/blob/e58a12bb918948eafece9e076fa6bb937e23b418/packages/aws-wrappers/src/s3/s3.ts#L155)

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

Defined in: [s3/s3.ts:75](https://github.com/aligent/microservice-development-utilities/blob/e58a12bb918948eafece9e076fa6bb937e23b418/packages/aws-wrappers/src/s3/s3.ts#L75)

Serialise a value to JSON and store it as an S3 object.

Note: the structured log line only includes `Bucket` and `Key` —
the JSON-encoded body is omitted to avoid spilling potentially
large or sensitive content into CloudWatch.

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

Defined in: [s3/s3.ts:59](https://github.com/aligent/microservice-development-utilities/blob/e58a12bb918948eafece9e076fa6bb937e23b418/packages/aws-wrappers/src/s3/s3.ts#L59)

Put an object into S3.

Note: the structured log line only includes `Bucket` and `Key` —
`Body` is omitted to avoid spilling large payloads or sensitive
content into CloudWatch.

#### Parameters

##### input

`Required`\<`Pick`\<`PutObjectCommandInput`, `"Bucket"` \| `"Key"` \| `"Body"`\>\>

Bucket, Key, and Body of the object to store.

#### Returns

`Promise`\<`PutObjectCommandOutput`\>
