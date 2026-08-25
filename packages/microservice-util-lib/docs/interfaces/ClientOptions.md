[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / ClientOptions

# Interface: ClientOptions

Defined in: node\_modules/openapi-fetch/dist/index.d.mts:4

Options for each client instance

## Extends

- `Omit`\<`RequestInit`, `"headers"`\>

## Properties

<a id="baseurl"></a>

### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: node\_modules/openapi-fetch/dist/index.d.mts:6

set the common root URL for all API requests

***

<a id="body"></a>

### body?

> `optional` **body?**: `BodyInit`

Defined in: node\_modules/undici-types/fetch.d.ts:125

#### Inherited from

`Omit.body`

***

<a id="bodyserializer"></a>

### bodySerializer?

> `optional` **bodySerializer?**: `BodySerializer`\<`unknown`\>

Defined in: node\_modules/openapi-fetch/dist/index.d.mts:14

global bodySerializer

***

<a id="credentials"></a>

### credentials?

> `optional` **credentials?**: `RequestCredentials`

Defined in: node\_modules/undici-types/fetch.d.ts:129

#### Inherited from

`Omit.credentials`

***

<a id="dispatcher"></a>

### dispatcher?

> `optional` **dispatcher?**: `Dispatcher`

Defined in: node\_modules/undici-types/fetch.d.ts:134

#### Inherited from

`Omit.dispatcher`

***

<a id="duplex"></a>

### duplex?

> `optional` **duplex?**: `"half"`

Defined in: node\_modules/undici-types/fetch.d.ts:135

#### Inherited from

`Omit.duplex`

***

<a id="fetch"></a>

### fetch?

> `optional` **fetch?**: (`input`) => `Promise`\<`Response`\>

Defined in: node\_modules/openapi-fetch/dist/index.d.mts:8

custom fetch (defaults to globalThis.fetch)

#### Parameters

##### input

`Request`

#### Returns

`Promise`\<`Response`\>

***

<a id="headers"></a>

### headers?

> `optional` **headers?**: `HeadersOptions`

Defined in: node\_modules/openapi-fetch/dist/index.d.mts:17

***

<a id="integrity"></a>

### integrity?

> `optional` **integrity?**: `string`

Defined in: node\_modules/undici-types/fetch.d.ts:127

#### Inherited from

`Omit.integrity`

***

<a id="keepalive"></a>

### keepalive?

> `optional` **keepalive?**: `boolean`

Defined in: node\_modules/undici-types/fetch.d.ts:123

#### Inherited from

`Omit.keepalive`

***

<a id="method"></a>

### method?

> `optional` **method?**: `string`

Defined in: node\_modules/undici-types/fetch.d.ts:122

#### Inherited from

`Omit.method`

***

<a id="mode"></a>

### mode?

> `optional` **mode?**: `RequestMode`

Defined in: node\_modules/undici-types/fetch.d.ts:130

#### Inherited from

`Omit.mode`

***

<a id="pathserializer"></a>

### pathSerializer?

> `optional` **pathSerializer?**: `PathSerializer`

Defined in: node\_modules/openapi-fetch/dist/index.d.mts:16

global pathSerializer

***

<a id="queryserializer"></a>

### querySerializer?

> `optional` **querySerializer?**: `QuerySerializer`\<`unknown`\> \| `QuerySerializerOptions`

Defined in: node\_modules/openapi-fetch/dist/index.d.mts:12

global querySerializer

***

<a id="redirect"></a>

### redirect?

> `optional` **redirect?**: `RequestRedirect`

Defined in: node\_modules/undici-types/fetch.d.ts:126

#### Inherited from

`Omit.redirect`

***

<a id="referrer"></a>

### referrer?

> `optional` **referrer?**: `string`

Defined in: node\_modules/undici-types/fetch.d.ts:131

#### Inherited from

`Omit.referrer`

***

<a id="referrerpolicy"></a>

### referrerPolicy?

> `optional` **referrerPolicy?**: `ReferrerPolicy`

Defined in: node\_modules/undici-types/fetch.d.ts:132

#### Inherited from

`Omit.referrerPolicy`

***

<a id="request"></a>

### Request?

> `optional` **Request?**: *typeof* `Request`

Defined in: node\_modules/openapi-fetch/dist/index.d.mts:10

custom Request (defaults to globalThis.Request)

***

<a id="requestinitext"></a>

### requestInitExt?

> `optional` **requestInitExt?**: `Record`\<`string`, `unknown`\>

Defined in: node\_modules/openapi-fetch/dist/index.d.mts:19

RequestInit extension object to pass as 2nd argument to fetch when supported (defaults to undefined)

***

<a id="signal"></a>

### signal?

> `optional` **signal?**: `AbortSignal` \| `null`

Defined in: node\_modules/undici-types/fetch.d.ts:128

#### Inherited from

`Omit.signal`

***

<a id="window"></a>

### window?

> `optional` **window?**: `null`

Defined in: node\_modules/undici-types/fetch.d.ts:133

#### Inherited from

`Omit.window`
