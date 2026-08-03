[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / S3Service

# Class: S3Service

Defined in: [s3/s3.ts:69](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L69)

Wrapper around the AWS S3 client providing structured Powertools logging
and X-Ray tracing by default.

At INFO the log lines omit payloads, secret material and PII; the verbose
levels (`POWERTOOLS_LOG_LEVEL=DEBUG` or `TRACE`) log full SDK inputs.

Input shapes are intentionally tight (Bucket/Key/Body only). Callers
needing SDK-level options not exposed here (server-side encryption,
tagging, version IDs) should use `S3Client` directly.

## Constructors

<a id="constructor"></a>

### Constructor

> **new S3Service**(`opts?`): `S3Service`

Defined in: [s3/s3.ts:79](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L79)

#### Parameters

##### opts?

###### client?

`S3Client`

Optional pre-configured `S3Client`. When supplied,
the wrapper does not apply X-Ray instrumentation.

###### logger?

`LoggerInterface`

Optional Powertools logger. Defaults to `new Logger()`,
which picks up `POWERTOOLS_SERVICE_NAME` from the environment.

#### Returns

`S3Service`

## Methods

<a id="copyobject"></a>

### copyObject()

> **copyObject**(`input`): `Promise`\<`CopyObjectCommandOutput`\>

Defined in: [s3/s3.ts:174](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L174)

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

Defined in: [s3/s3.ts:267](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L267)

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

Defined in: [s3/s3.ts:279](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L279)

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

Defined in: [s3/s3.ts:308](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L308)

Delete every object in a bucket. Streams the listing page-by-page and
delegates each page's deletion to `deleteObjects`, so peak memory stays
bounded by one page (~1000 keys) regardless of bucket size.

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

Defined in: [s3/s3.ts:205](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L205)

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

Defined in: [s3/s3.ts:152](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L152)

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

#### Throws

If the body is non-empty and not valid JSON.

***

<a id="getobject"></a>

### getObject()

> **getObject**(`input`): `Promise`\<`GetObjectCommandOutput`\>

Defined in: [s3/s3.ts:126](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L126)

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

Defined in: [s3/s3.ts:138](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L138)

Get an object from S3 and return its body as a string.

#### Parameters

##### input

`Required`\<`Pick`\<`GetObjectCommandInput`, `"Bucket"` \| `"Key"`\>\>

#### Returns

`Promise`\<`string` \| `undefined`\>

The object body as a string, or `undefined` if the response
has no body.

***

<a id="getpresignedurl"></a>

### getPresignedUrl()

> **getPresignedUrl**(`input`): `Promise`\<`string`\>

Defined in: [s3/s3.ts:243](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L243)

Generate a presigned URL that callers can use to GET or PUT an S3 object
directly, without going through the wrapper. The signing happens against
the wrapper's `S3Client`, so callers do not need their own client.

GET URLs are signed with `ResponseContentDisposition: 'attachment'` so
browsers download the object rather than rendering it in-place.

The input shape is an inline object (rather than the `Required<Pick<...>>`
pattern used by other S3 methods) because this method wraps two SDK
commands rather than one, and `action` / `expiresIn` are wrapper-level
concerns with no SDK-input equivalent.

#### Parameters

##### input

###### action

`"get"` \| `"put"`

`'get'` to download, `'put'` to upload.

###### Bucket

`string`

The S3 bucket name.

###### expiresIn?

`number`

URL lifetime in seconds. Defaults to 3600 (1 hour).

###### Key

`string`

The S3 object key.

#### Returns

`Promise`\<`string`\>

***

<a id="headobject"></a>

### headObject()

> **headObject**(`input`): `Promise`\<`HeadObjectCommandOutput`\>

Defined in: [s3/s3.ts:164](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L164)

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

Defined in: [s3/s3.ts:185](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L185)

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

Defined in: [s3/s3.ts:109](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L109)

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

`PutJsonObjectInput`\<`T`\>

#### Returns

`Promise`\<`PutObjectCommandOutput`\>

***

<a id="putobject"></a>

### putObject()

> **putObject**(`input`): `Promise`\<`PutObjectCommandOutput`\>

Defined in: [s3/s3.ts:93](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/s3/s3.ts#L93)

Put an object into S3.

Note: the structured log line only includes `Bucket` and `Key` —
`Body` is omitted to avoid spilling large payloads or sensitive
content into CloudWatch.

#### Parameters

##### input

`PutObjectInput`

Bucket, Key, and Body of the object to store.

#### Returns

`Promise`\<`PutObjectCommandOutput`\>
