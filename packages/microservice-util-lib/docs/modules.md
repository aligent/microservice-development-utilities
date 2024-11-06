@aligent/microservice-util-lib

# @aligent/microservice-util-lib

## Table of contents

### Classes

- [S3Dao](classes/S3Dao.md)

### Interfaces

- [RetryConfig](interfaces/RetryConfig.md)

### Type Aliases

- [ObjectMap](modules.md#objectmap)
- [Remap](modules.md#remap)

### Functions

- [chunkBy](modules.md#chunkby)
- [fetchSsmParams](modules.md#fetchssmparams)
- [getAwsIdFromArn](modules.md#getawsidfromarn)
- [hasDefinedProperties](modules.md#hasdefinedproperties)
- [remap](modules.md#remap-1)
- [retryWrapper](modules.md#retrywrapper)

## Type Aliases

### <a id="objectmap" name="objectmap"></a> ObjectMap

Ƭ **ObjectMap**: readonly readonly [`string`, `string`, Function?][]

A list of keys to keys, with an optional transformer function

#### Defined in

[remap/remap.ts:15](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/remap/remap.ts#lines-15)

---

### <a id="remap" name="remap"></a> Remap

Ƭ **Remap**<`MapArray`, `Original`\>: `SimplifyIntersection`<`ConstructTypeFromProperties`<`MapArray`, `Original`\>\>

#### Type parameters

| Name       | Type                                        |
| :--------- | :------------------------------------------ |
| `MapArray` | extends [`ObjectMap`](modules.md#objectmap) |
| `Original` | extends `Object`                            |

#### Defined in

[remap/remap.ts:159](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/remap/remap.ts#lines-159)

## Functions

### <a id="chunkby" name="chunkby"></a> chunkBy

▸ **chunkBy**<`ArrayItem`\>(`source`, `chunkSize`): `ArrayItem`[][]

Split an array into chunks of a certain size

**`Example`**

```ts
chunkBy([1, 2, 3, 4, 5, 6, 7], 2); // [[1, 2], [3, 4], [5, 6], [7]]
```

#### Type parameters

| Name        |
| :---------- |
| `ArrayItem` |

#### Parameters

| Name        | Type          | Description                                                             |
| :---------- | :------------ | :---------------------------------------------------------------------- |
| `source`    | `ArrayItem`[] | the array to split up                                                   |
| `chunkSize` | `number`      | the size of each chunk. (The final chunk will be whatever is remaining) |

#### Returns

`ArrayItem`[][]

#### Defined in

[chunkBy/chunkBy.ts:10](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/chunkBy/chunkBy.ts#lines-10)

---

### <a id="fetchssmparams" name="fetchssmparams"></a> fetchSsmParams

▸ **fetchSsmParams**(`param`): `Promise`<`Parameter`\>

Fetch one SSM parameter

#### Parameters

| Name    | Type     | Description                   |
| :------ | :------- | :---------------------------- |
| `param` | `string` | key of the parameter to fetch |

#### Returns

`Promise`<`Parameter`\>

#### Defined in

[fetchSsmParams/fetchSsmParams.ts:14](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/fetchSsmParams/fetchSsmParams.ts#lines-14)

▸ **fetchSsmParams**(`...params`): `Promise`<`Parameter`[]\>

Fetch a list of SSM parameters

#### Parameters

| Name        | Type       | Description                     |
| :---------- | :--------- | :------------------------------ |
| `...params` | `string`[] | list of parameter keys to fetch |

#### Returns

`Promise`<`Parameter`[]\>

#### Defined in

[fetchSsmParams/fetchSsmParams.ts:21](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/fetchSsmParams/fetchSsmParams.ts#lines-21)

---

### <a id="getawsidfromarn" name="getawsidfromarn"></a> getAwsIdFromArn

▸ **getAwsIdFromArn**(`resourceArn`): `string`

Get the AWS ID from its resource ARN

**`Throws`**

when the provided ARN is empty

**`Example`**

```ts
getAwsIdFromArn(
  'arn:aws:states:ap-southeast-2:123123123:execution:prj-int-entity-ac-dc-dev-machine-name:this-is-the-id'
);
```

#### Parameters

| Name          | Type     | Description                 |
| :------------ | :------- | :-------------------------- |
| `resourceArn` | `string` | the ARN of the AWS resource |

#### Returns

`string`

the ID (if present in the ARN) of the AWS resource/execution

#### Defined in

[getAwsIdFromArn/getAwsIdFromArn.ts:11](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/getAwsIdFromArn/getAwsIdFromArn.ts#lines-11)

---

### <a id="hasdefinedproperties" name="hasdefinedproperties"></a> hasDefinedProperties

▸ **hasDefinedProperties**<`T`, `K`\>(`obj`, `...keys`): obj is SimplifyIntersection<Required<Pick<T, K\>\> & Omit<T, K\>\>

Ensure that the given properties are defined on the object.

**`Example`**

```ts
type Foo = { a?: number; b?: number };
const foo: Foo = { a: 1, b: 2 };
if (hasDefinedProperties(foo, 'a')) {
  console.log(foo);
  //          ^? const bar: {
  //               a: number;
  //               b?: number;
  //             }
}
```

#### Type parameters

| Name | Type                                     |
| :--- | :--------------------------------------- |
| `T`  | extends `Object`                         |
| `K`  | extends `string` \| `number` \| `symbol` |

#### Parameters

| Name      | Type            | Description          |
| :-------- | :-------------- | :------------------- |
| `obj`     | `object` \| `T` | The object to check. |
| `...keys` | `K`[]           | The keys to check.   |

#### Returns

obj is SimplifyIntersection<Required<Pick<T, K\>\> & Omit<T, K\>\>

`true` if the object has the given properties defined, `false` otherwise.

#### Defined in

[hasPropertiesDefined/hasPropertiesDefined.ts:22](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/hasPropertiesDefined/hasPropertiesDefined.ts#lines-22)

---

### <a id="remap-1" name="remap-1"></a> remap

▸ **remap**<`Original`, `MapArray`\>(`object`, `map`): [`Remap`](modules.md#remap)<`MapArray`, `Original`\>

Map one object's values to another structure

**`Example`**

without a transformer function

```ts
const map = [
  ['foo', 'baz'],
  ['bar', 'qux.0'],
] as const;
const obj = { foo: 'hi', bar: 7 };
remap(obj, map); // { baz: 'hi', qux: [7] }
```

**`Example`**

with a transformer function

```ts
const map = [
  ['foo', 'baz'],
  ['bar', 'qux.0', (x: number) => x + 1],
] as const;
const obj = { foo: 'hi', bar: 7 };
remap(obj, map); // { baz: 'hi', qux: [8] }
```

**`Example`**

with an empty initial key

```ts
const map = [['', 'baz', (x: { foo: number; bar: number }) => x.foo + x.bar]];
const obj = { foo: 3, bar: 7 };
remap(obj, map); // { baz: 10 }
```

#### Type parameters

| Name       | Type                                                                            |
| :--------- | :------------------------------------------------------------------------------ |
| `Original` | extends `Object`                                                                |
| `MapArray` | extends readonly readonly [`string`, `string`, (...`args`: `any`[]) => `any`][] |

#### Parameters

| Name     | Type       | Description              |
| :------- | :--------- | :----------------------- |
| `object` | `Original` | the object to map from   |
| `map`    | `MapArray` | the keys for the mapping |

#### Returns

[`Remap`](modules.md#remap)<`MapArray`, `Original`\>

the remapped object

#### Defined in

[remap/remap.ts:198](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/remap/remap.ts#lines-198)

---

### <a id="retrywrapper" name="retrywrapper"></a> retryWrapper

▸ **retryWrapper**<`T`\>(`fn`, `config`): `Promise`<`T`\>

Retry an async function if it fails

**`Example`**

```ts
retryWrapper(someAsyncFunction, {
  retries: 3,
  onRetry: (_, error) => console.error(error),
});
```

#### Type parameters

| Name |
| :--- |
| `T`  |

#### Parameters

| Name     | Type                                       | Description                   |
| :------- | :----------------------------------------- | :---------------------------- |
| `fn`     | () => `Promise`<`T`\>                      | the function to be retried    |
| `config` | [`RetryConfig`](interfaces/RetryConfig.md) | the configuration for retries |

#### Returns

`Promise`<`T`\>

#### Defined in

[retryWrapper/retryWrapper.ts:78](https://bitbucket.org/aligent/microservice-util-lib/src/0dfe425/src/retryWrapper/retryWrapper.ts#lines-78)
