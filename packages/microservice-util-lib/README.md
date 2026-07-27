# Microservices Utilities Library

This library includes utility functions to simplify & standardise common
MicroServices tasks.

## Documentation

Documentation on each function can be found [here](docs/modules.md)

## Deprecations

`fetchSsmParams` and `S3Dao` are deprecated in favour of `SSMService` and
`S3Service` from [`@aligent/aws-wrappers`](../aws-wrappers/README.md), which add
Powertools structured logging and X-Ray tracing by default.

### `fetchSsmParams` → `SSMService`

Parameters are addressed by caller-chosen aliases rather than positionally, and
values are returned directly instead of wrapped in SDK `Parameter` objects.

```ts
// Before
const [username, password] = await fetchSsmParams('/app/username', '/app/password');
console.log(username?.Value);

// After
const ssm = new SSMService();
const { username, password } = await ssm.getParameters({
  username: '/app/username',
  password: '/app/password',
});
```

For a single parameter, use `ssm.getParameter('/app/username')`.

### `S3Dao` → `S3Service`

`S3Service` takes the bucket per call rather than per instance, so one instance
serves every bucket. `Key` is always explicit — supply the `object-hash` value
yourself if you relied on `storeData`'s hashed default.

```ts
// Before
const dao = new S3Dao('my-bucket');
const object = await dao.storeData(payload, key);
const data = await dao.fetchData<Payload>(object);
await dao.deleteData(object);

// After
const s3 = new S3Service();
await s3.putJsonObject({ Bucket: 'my-bucket', Key: key, Body: payload });
const data = await s3.getJsonObject<Payload>({ Bucket: 'my-bucket', Key: key });
await s3.deleteObject({ Bucket: 'my-bucket', Key: key });
```

| `S3Dao`        | `S3Service`                             |
| -------------- | --------------------------------------- |
| `storeData`    | `putJsonObject`                         |
| `fetchData`    | `getJsonObject`                         |
| `deleteData`   | `deleteObject`                          |
| `storeChunked` | `chunkBy` + `putJsonObject` per chunk   |
| `fetchChunks`  | iterate keys, `getJsonObject` per chunk |

`storeChunked` and `fetchChunks` have no direct equivalent — compose the
existing `chunkBy` helper with the per-object methods:

```ts
const s3 = new S3Service();
const keys = await Promise.all(
  chunkBy(rows, 100).map(async (chunk, i) => {
    const Key = `${prefix}/${i}`;
    await s3.putJsonObject({ Bucket: 'my-bucket', Key, Body: chunk });
    return Key;
  })
);

for (const Key of keys) {
  const chunk = await s3.getJsonObject<Row[]>({ Bucket: 'my-bucket', Key });
}
```

## Build

This library is written in typescript and can be built using the NPM script:

```sh
npm install
npm run build
```

## Installation

You can locally install this package to your NPM projects by pulling this repo,
building it, then running:

```sh
npm install --save ./path/to/this/project
```

from your project root.

## Testing & Linting

Vitest tests, linting & type-checking can be run with

```sh
npm run test
```
