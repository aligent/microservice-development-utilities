[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / remap

# Function: remap()

> **remap**\<`Original`, `MapArray`\>(`object`, `map`): `SimplifyIntersection`\<`ConstructTypeFromProperties`\<`MapArray`, `Original`, `0`\>\>

Defined in: [remap/remap.ts:183](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/remap/remap.ts#L183)

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

```ts
const map = [
  ['foo', 'baz'],
  ['bar', 'qux.0']
] as const;
const obj = { foo: 'hi', bar: 7 }
remap(obj, map); // { baz: 'hi', qux: [7] }
```

```ts
const map = [
 ['foo', 'baz'],
 ['bar', 'qux.0', (x: number) => x + 1]
] as const;
const obj = { foo: 'hi', bar: 7 }
remap(obj, map); // { baz: 'hi', qux: [8] }
```

```ts
const map = [
  ['', 'baz', (x: { foo: number, bar: number }) => x.foo + x.bar]
]
const obj = { foo: 3, bar: 7 }
remap(obj, map); // { baz: 10 }
```
