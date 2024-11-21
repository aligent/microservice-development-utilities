[**@aligent/microservice-util-lib**](../modules.md) • **Docs**

---

[@aligent/microservice-util-lib](../modules.md) / remap

# Function: remap()

> **remap**\<`Original`, `MapArray`\>(`object`, `map`): [`Remap`](../type-aliases/Remap.md)\<`MapArray`, `Original`\>

Map one object's values to another structure

## Type Parameters

• **Original** _extends_ `object`

• **MapArray** _extends_ [`ObjectMap`](../type-aliases/ObjectMap.md)

## Parameters

• **object**: `Original`

the object to map from

• **map**: `MapArray`

the keys for the mapping

## Returns

[`Remap`](../type-aliases/Remap.md)\<`MapArray`, `Original`\>

the remapped object

## Examples

```ts
const map = [
  ['foo', 'baz'],
  ['bar', 'qux.0'],
] as const;
const obj = { foo: 'hi', bar: 7 };
remap(obj, map); // { baz: 'hi', qux: [7] }
```

```ts
const map = [
  ['foo', 'baz'],
  ['bar', 'qux.0', (x: number) => x + 1],
] as const;
const obj = { foo: 'hi', bar: 7 };
remap(obj, map); // { baz: 'hi', qux: [8] }
```

```ts
const map = [['', 'baz', (x: { foo: number; bar: number }) => x.foo + x.bar]];
const obj = { foo: 3, bar: 7 };
remap(obj, map); // { baz: 10 }
```

## Defined in

[remap/remap.ts:181](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/remap/remap.ts#L181)
