[**@aligent/aws-wrappers**](../../../modules.md)

***

[@aligent/aws-wrappers](../../../modules.md) / [testing/testing](../modules.md) / createMockService

# Function: createMockService()

> **createMockService**\<`T`, `O`\>(`service`, `overrides`): `T` & `O`

Defined in: [testing/testing.ts:63](https://github.com/aligent/microservice-development-utilities/blob/e04daa76e0cc8e088b996db4b8b0bdc8466a8cbc/packages/aws-wrappers/src/testing/testing.ts#L63)

Build a stand-in for a service class from an object of method overrides, for
use in unit tests of code that depends on the service.

Accessing a method of the class that was not overridden throws immediately,
naming the service and the method, rather than failing later as
`is not a function`. Any other key falls through to the overrides object —
so `toString`, `valueOf` and `constructor` resolve from `Object.prototype`
as usual, and anything else is `undefined`. That fallback is what keeps
probe properties safe: `then` (so awaiting the mock does not throw),
`Symbol.toStringTag`, inspection symbols, and whatever a test framework's
error serialiser reaches for.

The helper imports no test framework: callers supply their own spies, and
overridden keys keep the caller's spy type so `.mock` resolves through the
returned object.

## Type Parameters

### T

`T` *extends* `object`

### O

`O` *extends* `Partial`\<`T`\>

## Parameters

### service

The service class itself. It is never constructed — only
its prototype is read — so the parameter is typed as just that capability,
which also accepts abstract classes and classes with required constructor
arguments. Passing the class as a value (rather than as an explicit type
argument) is load-bearing for the types: TypeScript has no partial
type-argument inference, so an explicit `T` would suppress inference of the
overrides type and lose the caller's spy typing on overridden keys.

#### prototype

`T`

### overrides

`O`

The methods the code under test actually calls. Keys are
checked against the class's public surface, so a typo or a wrong-shaped
override is a compile error.

## Returns

`T` & `O`

## Example

```typescript
const getJsonObject = vi.fn().mockResolvedValue({ id: 1 });
const s3 = createMockService(S3Service, { getJsonObject });

await handler({ s3 });

expect(s3.getJsonObject.mock.calls).toHaveLength(1);
```
