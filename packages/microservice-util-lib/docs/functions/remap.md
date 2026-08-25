[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / remap

# Function: remap()

> **remap**\<`Original`, `MapArray`\>(`object`, `map`): `SimplifyIntersection`\<`ConstructTypeFromProperties`\<`MapArray`, `Original`, `0`\>\>

Defined in: [packages/microservice-util-lib/src/remap/remap.ts:246](https://github.com/aligent/microservice-development-utilities/blob/bdd7e82de06e0611b27ae79005e5208ce3f07b51/packages/microservice-util-lib/src/remap/remap.ts#L246)

Map one object's values to another structure

## Type Parameters

### Original

`Original` *extends* `object`

### MapArray

`MapArray` *extends* [`ObjectMap`](../type-aliases/ObjectMap.md)

## Parameters

### object

`Original`

the object to map from

### map

`MapArray`

the keys for the mapping

## Returns

`SimplifyIntersection`\<`ConstructTypeFromProperties`\<`MapArray`, `Original`, `0`\>\>

the remapped object

## Examples

**without a transformer function**

```ts
const map = [
  ['foo', 'baz'],
  ['bar', 'qux.0']
] as const;
const obj = { foo: 'hi', bar: 7 }
remap(obj, map); // { baz: 'hi', qux: [7] }
```

**with a transformer function**

```ts
const map = [
 ['foo', 'baz'],
 ['bar', 'qux.0', (x: number) => x + 1]
] as const;
const obj = { foo: 'hi', bar: 7 }
remap(obj, map); // { baz: 'hi', qux: [8] }
```

**with an empty initial key**

```ts
const map = [
  ['', 'baz', (x: { foo: number, bar: number }) => x.foo + x.bar]
]
const obj = { foo: 3, bar: 7 }
remap(obj, map); // { baz: 10 }
```
