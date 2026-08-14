[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / hasDefinedProperties

# Function: hasDefinedProperties()

> **hasDefinedProperties**\<`T`, `K`\>(`obj`, ...`keys`): `obj is SimplifyIntersection<Required<Pick<T, K>> & Omit<T, K>>`

Defined in: [packages/microservice-util-lib/src/has-properties-defined/has-properties-defined.ts:23](https://github.com/aligent/microservice-development-utilities/blob/039104d2966f94c9d0628f648b1827b63578171a/packages/microservice-util-lib/src/has-properties-defined/has-properties-defined.ts#L23)

Ensure that the given properties are defined on the object.

## Type Parameters

### T

`T` *extends* `object`

### K

`K` *extends* `string` \| `number` \| `symbol`

## Parameters

### obj

`object` \| `T`

The object to check.

### keys

...`K`[]

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
