[**@aligent/microservice-util-lib**](../modules.md) • **Docs**

---

[@aligent/microservice-util-lib](../modules.md) / hasDefinedProperties

# Function: hasDefinedProperties()

> **hasDefinedProperties**\<`T`, `K`\>(`obj`, ...`keys`): `obj is SimplifyIntersection<Required<Pick<T, K>> & Omit<T, K>>`

Ensure that the given properties are defined on the object.

## Type Parameters

• **T** _extends_ `object`

• **K** _extends_ `string` \| `number` \| `symbol`

## Parameters

• **obj**: `object` \| `T`

The object to check.

• ...**keys**: `K`[]

The keys to check.

## Returns

`obj is SimplifyIntersection<Required<Pick<T, K>> & Omit<T, K>>`

`true` if the object has the given properties defined, `false` otherwise.

## Example

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

## Defined in

[has-properties-defined/has-properties-defined.ts:22](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/has-properties-defined/has-properties-defined.ts#L22)
