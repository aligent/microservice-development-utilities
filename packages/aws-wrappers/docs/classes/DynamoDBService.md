[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / DynamoDBService

# Class: DynamoDBService

Defined in: [dynamodb/dynamodb.ts:49](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L49)

Wrapper around the AWS DynamoDB Document client providing structured
Powertools logging and X-Ray tracing by default.

Items are automatically marshalled / unmarshalled via the document client —
callers work with plain TypeScript objects in both directions.

## Constructors

<a id="constructor"></a>

### Constructor

> **new DynamoDBService**(`opts?`): `DynamoDBService`

Defined in: [dynamodb/dynamodb.ts:62](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L62)

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

`Logger`

Optional Powertools logger. Defaults to a logger with
`serviceName: 'DynamoDBService'`.

#### Returns

`DynamoDBService`

## Methods

<a id="batchget"></a>

### batchGet()

> **batchGet**(`input`): `Promise`\<`BatchGetCommandOutput`\>

Defined in: [dynamodb/dynamodb.ts:159](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L159)

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

Defined in: [dynamodb/dynamodb.ts:169](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L169)

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

> **deleteItem**\<`T`\>(`input`): `Promise`\<`Omit`\<`DeleteCommandOutput`, `"Attributes"`\> & `object`\>

Defined in: [dynamodb/dynamodb.ts:116](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L116)

Delete an item from DynamoDB. The `Attributes` field on the response is
typed as `T` — relevant when `ReturnValues: 'ALL_OLD'` is set.

#### Type Parameters

##### T

`T` = `Record`\<`string`, `unknown`\>

Expected shape of the returned `Attributes`.

#### Parameters

##### input

`DeleteCommandInput`

#### Returns

`Promise`\<`Omit`\<`DeleteCommandOutput`, `"Attributes"`\> & `object`\>

***

<a id="getitem"></a>

### getItem()

> **getItem**\<`T`\>(`input`): `Promise`\<`T` \| `undefined`\>

Defined in: [dynamodb/dynamodb.ts:76](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L76)

Get an item from DynamoDB.

#### Type Parameters

##### T

`T` = `Record`\<`string`, `unknown`\>

Expected unmarshalled item shape.

#### Parameters

##### input

`GetCommandInput`

#### Returns

`Promise`\<`T` \| `undefined`\>

The item, or `undefined` if not found.

***

<a id="paginateitems"></a>

### paginateItems()

> **paginateItems**\<`T`\>(`input`): `AsyncGenerator`\<`T`\>

Defined in: [dynamodb/dynamodb.ts:190](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L190)

Paginate over Query results, yielding one unmarshalled item at a time.

#### Type Parameters

##### T

`T` = `Record`\<`string`, `unknown`\>

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

Defined in: [dynamodb/dynamodb.ts:203](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L203)

Paginate over Scan results, yielding one unmarshalled item at a time.

#### Type Parameters

##### T

`T` = `Record`\<`string`, `unknown`\>

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

Defined in: [dynamodb/dynamodb.ts:87](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L87)

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

Defined in: [dynamodb/dynamodb.ts:130](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L130)

Execute a DynamoDB Query. The full `QueryCommandOutput` is returned with
`Items` typed as `T[]` so callers retain pagination metadata
(`LastEvaluatedKey`, `Count`, etc.).

#### Type Parameters

##### T

`T` = `Record`\<`string`, `unknown`\>

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

Defined in: [dynamodb/dynamodb.ts:143](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L143)

Scan a DynamoDB table. The full `ScanCommandOutput` is returned with
`Items` typed as `T[]` so callers retain pagination metadata.

#### Type Parameters

##### T

`T` = `Record`\<`string`, `unknown`\>

Expected shape of each unmarshalled item.

#### Parameters

##### input

`ScanCommandInput`

#### Returns

`Promise`\<`Omit`\<`ScanCommandOutput`, `"Items"`\> & `object`\>

***

<a id="updateitem"></a>

### updateItem()

> **updateItem**\<`T`\>(`input`): `Promise`\<`Omit`\<`UpdateCommandOutput`, `"Attributes"`\> & `object`\>

Defined in: [dynamodb/dynamodb.ts:103](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/dynamodb/dynamodb.ts#L103)

Update an item in DynamoDB. The `Attributes` field on the response is
typed as `T` — the caller should choose `T` to match their
`ReturnValues` setting:
- `NONE` (default): no `Attributes` returned.
- `ALL_OLD` / `ALL_NEW`: full item.
- `UPDATED_OLD` / `UPDATED_NEW`: only updated attributes (partial).

#### Type Parameters

##### T

`T` = `Record`\<`string`, `unknown`\>

Expected shape of the returned `Attributes`.

#### Parameters

##### input

`UpdateCommandInput`

#### Returns

`Promise`\<`Omit`\<`UpdateCommandOutput`, `"Attributes"`\> & `object`\>
