[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / ErrorThrowingClient

# Interface: ErrorThrowingClient\<Paths, Media\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts:88](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts#L88)

A Client whose HTTP methods return only the success branch
({ data: D; response: Response }), reflecting the runtime contract
when retryMiddleware is registered with throwOnNotOk: true (the default).

Errors are thrown as HttpResponseError, never returned in the union.

## Type Parameters

### Paths

`Paths` *extends* `object`

### Media

`Media` *extends* `MediaType` = `MediaType`

## Properties

<a id="delete"></a>

### DELETE

> **DELETE**: `ThrowingClientMethod`\<`Paths`, `"delete"`, `Media`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts:92](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts#L92)

***

<a id="get"></a>

### GET

> **GET**: `ThrowingClientMethod`\<`Paths`, `"get"`, `Media`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts:89](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts#L89)

***

<a id="head"></a>

### HEAD

> **HEAD**: `ThrowingClientMethod`\<`Paths`, `"head"`, `Media`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts:94](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts#L94)

***

<a id="options"></a>

### OPTIONS

> **OPTIONS**: `ThrowingClientMethod`\<`Paths`, `"options"`, `Media`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts:93](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts#L93)

***

<a id="patch"></a>

### PATCH

> **PATCH**: `ThrowingClientMethod`\<`Paths`, `"patch"`, `Media`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts:95](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts#L95)

***

<a id="post"></a>

### POST

> **POST**: `ThrowingClientMethod`\<`Paths`, `"post"`, `Media`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts:91](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts#L91)

***

<a id="put"></a>

### PUT

> **PUT**: `ThrowingClientMethod`\<`Paths`, `"put"`, `Media`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts:90](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts#L90)

***

<a id="trace"></a>

### TRACE

> **TRACE**: `ThrowingClientMethod`\<`Paths`, `"trace"`, `Media`\>

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts:96](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts#L96)

## Methods

<a id="eject"></a>

### eject()

> **eject**(...`middleware`): `void`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts:98](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts#L98)

#### Parameters

##### middleware

...`Middleware`[]

#### Returns

`void`

***

<a id="use"></a>

### use()

> **use**(...`middleware`): `void`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts:97](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/throwing-client.ts#L97)

#### Parameters

##### middleware

...`Middleware`[]

#### Returns

`void`
