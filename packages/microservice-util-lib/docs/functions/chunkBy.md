[**@aligent/microservice-util-lib**](../modules.md) • **Docs**

---

[@aligent/microservice-util-lib](../modules.md) / chunkBy

# Function: chunkBy()

> **chunkBy**\<`ArrayItem`\>(`source`, `chunkSize`): `ArrayItem`[][]

Split an array into chunks of a certain size

## Type Parameters

• **ArrayItem**

## Parameters

• **source**: `ArrayItem`[]

the array to split up

• **chunkSize**: `number`

the size of each chunk. (The final chunk will be whatever is remaining)

## Returns

`ArrayItem`[][]

## Example

```ts
chunkBy([1, 2, 3, 4, 5, 6, 7], 2); // [[1, 2], [3, 4], [5, 6], [7]]
```

## Defined in

[chunk-by/chunk-by.ts:10](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/chunk-by/chunk-by.ts#L10)
