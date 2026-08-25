[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / chunkBy

# Function: chunkBy()

> **chunkBy**\<`ArrayItem`\>(`source`, `chunkSize`): `ArrayItem`[][]

Defined in: [packages/microservice-util-lib/src/chunk-by/chunk-by.ts:10](https://github.com/aligent/microservice-development-utilities/blob/bdd7e82de06e0611b27ae79005e5208ce3f07b51/packages/microservice-util-lib/src/chunk-by/chunk-by.ts#L10)

Split an array into chunks of a certain size

## Type Parameters

### ArrayItem

`ArrayItem`

## Parameters

### source

`ArrayItem`[]

the array to split up

### chunkSize

`number`

the size of each chunk. (The final chunk will be whatever is remaining)

## Returns

`ArrayItem`[][]

## Example

```ts
chunkBy([1, 2, 3, 4, 5, 6, 7], 2) // [[1, 2], [3, 4], [5, 6], [7]]
```
