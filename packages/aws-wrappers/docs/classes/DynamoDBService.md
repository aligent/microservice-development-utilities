[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / DynamoDBService

# Class: DynamoDBService

Defined in: [dynamodb/dynamodb.ts:152](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L152)

Wrapper around the AWS DynamoDB Document client providing structured
Powertools logging and X-Ray tracing by default.

At INFO the log lines omit payloads, secret material and PII; the verbose
levels (`POWERTOOLS_LOG_LEVEL=DEBUG` or `TRACE`) log full SDK inputs.

Items are automatically marshalled / unmarshalled via the document client —
callers work with plain TypeScript objects in both directions.

## Constructors

<a id="constructor"></a>

### Constructor

> **new DynamoDBService**(`opts?`): `DynamoDBService`

Defined in: [dynamodb/dynamodb.ts:165](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L165)

#### Parameters

##### opts?

###### client?

`DynamoDBDocumentClient`

Optional pre-configured `DynamoDBDocumentClient`.
When supplied, the wrapper does not apply X-Ray instrumentation. When
omitted, a default `DynamoDBClient` is wrapped with `captureAWSv3Client`
*before* being passed to `DynamoDBDocumentClient.from`, so X-Ray
tracing captures every DynamoDB call.

###### logger?

`LoggerInterface`

Optional Powertools logger. Defaults to `new Logger()`,
which picks up `POWERTOOLS_SERVICE_NAME` from the environment.

#### Returns

`DynamoDBService`

## Methods

<a id="batchget"></a>

### batchGet()

> **batchGet**(`input`): `Promise`\<`BatchGetCommandOutput`\>

Defined in: [dynamodb/dynamodb.ts:316](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L316)

Batch-get items from one or more DynamoDB tables.

Note: this method is intentionally **not** generic. `BatchGet`'s
`Responses` field is a multi-table `Record<string, item[]>` whose item
shapes can differ per table — no single `T` can soundly describe it.
Callers should narrow the result type at the call site.

#### Parameters

##### input

`BatchGetCommandInput`

#### Returns

`Promise`\<`BatchGetCommandOutput`\>

***

<a id="batchwrite"></a>

### batchWrite()

> **batchWrite**(`input`): `Promise`\<`BatchWriteCommandOutput`\>

Defined in: [dynamodb/dynamodb.ts:333](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L333)

Batch-write items to DynamoDB, retrying `UnprocessedItems` with jittered
exponential backoff. Up to 5 attempts (200ms base delay). Throws when
items remain unprocessed after the final attempt.

#### Parameters

##### input

`BatchWriteCommandInput`

#### Returns

`Promise`\<`BatchWriteCommandOutput`\>

***

<a id="deleteitem"></a>

### deleteItem()

> **deleteItem**\<`K`, `R`\>(`input`): `Promise`\<`Omit`\<`DeleteCommandOutput`, `"Attributes"`\> & `object`\>

Defined in: [dynamodb/dynamodb.ts:246](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L246)

Delete an item from DynamoDB. The `Attributes` field on the response is
typed as `R` — relevant when `ReturnValues: 'ALL_OLD'` is set.

#### Type Parameters

##### K

`K` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

Shape of the partition / sort key.

##### R

`R` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

Expected shape of the returned `Attributes`.

#### Parameters

##### input

`WithTypedKey`\<`DeleteCommandInput`, `K`\>

#### Returns

`Promise`\<`Omit`\<`DeleteCommandOutput`, `"Attributes"`\> & `object`\>

***

<a id="getitem"></a>

### getItem()

> **getItem**\<`K`, `R`\>(`input`): `Promise`\<`R` \| `undefined`\>

Defined in: [dynamodb/dynamodb.ts:180](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L180)

Get an item from DynamoDB.

#### Type Parameters

##### K

`K` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

Shape of the partition / sort key.

##### R

`R` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

Expected unmarshalled item shape.

#### Parameters

##### input

`WithTypedKey`\<`GetCommandInput`, `K`\>

#### Returns

`Promise`\<`R` \| `undefined`\>

The item, or `undefined` if not found.

***

<a id="paginateitems"></a>

### paginateItems()

> **paginateItems**\<`T`\>(`input`): `AsyncGenerator`\<`T`\>

Defined in: [dynamodb/dynamodb.ts:361](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L361)

Paginate over Query results, yielding one unmarshalled item at a time.

#### Type Parameters

##### T

`T` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

Expected shape of each yielded item.

#### Parameters

##### input

`QueryCommandInput`

#### Returns

`AsyncGenerator`\<`T`\>

***

<a id="paginatescan"></a>

### paginateScan()

> **paginateScan**\<`T`\>(`input`): `AsyncGenerator`\<`T`\>

Defined in: [dynamodb/dynamodb.ts:378](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L378)

Paginate over Scan results, yielding one unmarshalled item at a time.

#### Type Parameters

##### T

`T` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

Expected shape of each yielded item.

#### Parameters

##### input

`ScanCommandInput`

#### Returns

`AsyncGenerator`\<`T`\>

***

<a id="putitem"></a>

### putItem()

> **putItem**\<`T`\>(`input`): `Promise`\<`PutCommandOutput`\>

Defined in: [dynamodb/dynamodb.ts:200](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L200)

Put an item into DynamoDB. The caller's `Item` is typed as `T`, which
the document client marshalls automatically.

#### Type Parameters

##### T

`T`

Type of the item being stored.

#### Parameters

##### input

`Omit`\<`PutCommandInput`, `"Item"`\> & `object`

#### Returns

`Promise`\<`PutCommandOutput`\>

***

<a id="query"></a>

### query()

> **query**\<`T`\>(`input`): `Promise`\<`Omit`\<`QueryCommandOutput`, `"Items"`\> & `object`\>

Defined in: [dynamodb/dynamodb.ts:269](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L269)

Execute a DynamoDB Query. The full `QueryCommandOutput` is returned with
`Items` typed as `T[]` so callers retain pagination metadata
(`LastEvaluatedKey`, `Count`, etc.).

#### Type Parameters

##### T

`T` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

Expected shape of each unmarshalled item.

#### Parameters

##### input

`QueryCommandInput`

#### Returns

`Promise`\<`Omit`\<`QueryCommandOutput`, `"Items"`\> & `object`\>

***

<a id="scan"></a>

### scan()

> **scan**\<`T`\>(`input`): `Promise`\<`Omit`\<`ScanCommandOutput`, `"Items"`\> & `object`\>

Defined in: [dynamodb/dynamodb.ts:298](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L298)

Scan a DynamoDB table. The full `ScanCommandOutput` is returned with
`Items` typed as `T[]` so callers retain pagination metadata.

Scan reads every item in the table, so cost and latency grow linearly
with table size; it is rarely the right tool in a runtime service.
Prefer, in order:

  1. `query` with the table's partition key.
  2. `query` against a GSI or LSI whose key matches your access pattern.
  3. A sparse GSI populated only for the items you need to enumerate.
  4. A denormalised lookup item or table maintained on write.

Legitimate scan use cases are mostly one-off admin work (export,
migration, audit). For those, prefer the AWS CLI or Console rather than
embedding a scan in a Lambda.

#### Type Parameters

##### T

`T` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

Expected shape of each unmarshalled item.

#### Parameters

##### input

`ScanCommandInput`

#### Returns

`Promise`\<`Omit`\<`ScanCommandOutput`, `"Items"`\> & `object`\>

***

<a id="updateitem"></a>

### updateItem()

> **updateItem**\<`K`, `R`\>(`input`): `Promise`\<`Omit`\<`UpdateCommandOutput`, `"Attributes"`\> & `object`\>

Defined in: [dynamodb/dynamodb.ts:223](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L223)

Update an item in DynamoDB. The `Attributes` field on the response is
typed as `R` — the caller should choose `R` to match their
`ReturnValues` setting:
- `NONE` (default): no `Attributes` returned.
- `ALL_OLD` / `ALL_NEW`: full item.
- `UPDATED_OLD` / `UPDATED_NEW`: only updated attributes (partial).

#### Type Parameters

##### K

`K` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

Shape of the partition / sort key.

##### R

`R` *extends* `Record`\<`string`, `unknown`\> = `Record`\<`string`, `unknown`\>

Expected shape of the returned `Attributes`.

#### Parameters

##### input

`WithTypedKey`\<`UpdateCommandInput`, `K`\>

#### Returns

`Promise`\<`Omit`\<`UpdateCommandOutput`, `"Attributes"`\> & `object`\>
