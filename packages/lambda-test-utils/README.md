# @aligent/lambda-test-utils

Small, dependency-light test utilities for asserting the input/output of API Gateway-attached Lambda handlers without standing up a real HTTP layer.

API Gateway handlers tend to get skipped by unit tests because they're treated as integration tests. This package builds a valid `APIGatewayProxyEvent` and Lambda `Context`, invokes your handler with them, and hands back a parsed response — so you can unit test the handler directly.

Scope is limited to input/output assertions. Mocking side effects (S3, DynamoDB, etc.) stays the test author's responsibility, outside this harness. There's no real HTTP-layer emulation (no supertest / local server).

If your handler talks to AWS, build its clients with [`@aligent/aws-wrappers`](../aws-wrappers) and stub them in your handler tests with that package's [`createMockService`](../aws-wrappers#testing) helper (`@aligent/aws-wrappers/testing`), alongside `invokeApiGatewayHandler` below.

## Installation

```sh
npm install --save-dev @aligent/lambda-test-utils
```

Requires **Node 18 or later**.

## Usage

```ts
import { invokeApiGatewayHandler, withJsonBody } from '@aligent/lambda-test-utils';
import { handler } from './create-order';

it('creates an order and returns its id', async () => {
    const response = await invokeApiGatewayHandler(
        handler,
        withJsonBody({ httpMethod: 'POST', path: '/orders' }, { sku: 'ABC-123', quantity: 2 })
    );

    expect(response.statusCode).toBe(201);
    expect(response.json<{ orderId: string }>()).toEqual({ orderId: expect.any(String) });
});
```

### Building an event directly

```ts
import { buildApiGatewayEvent } from '@aligent/lambda-test-utils';

const event = buildApiGatewayEvent({
    httpMethod: 'GET',
    path: '/orders/123',
    pathParameters: { orderId: '123' },
});
```

`overrides` is deep-merged onto the built-in defaults, so overriding one field of `headers` or `requestContext` doesn't drop the rest of the defaults.

### Building a context directly

```ts
import { buildLambdaContext } from '@aligent/lambda-test-utils';

const context = buildLambdaContext({ functionName: 'create-order', memoryLimitInMB: '256' });
```

### `InvokedResponse`

`invokeApiGatewayHandler` resolves an `InvokedResponse`:

```ts
interface InvokedResponse {
    statusCode: number;
    headers: APIGatewayProxyResult['headers'];
    body: string;
    json<T>(): T;
}
```

`json()` parses `body` as JSON and throws a clear error if the body isn't valid JSON.

### Mocking AWS clients used by the handler

`invokeApiGatewayHandler` only exercises input/output — it doesn't mock AWS side effects. Pair it with [`createMockService`](../aws-wrappers#testing) from `@aligent/aws-wrappers/testing` when the handler under test depends on an `aws-wrappers` `*Service`:

```ts
import { createMockService } from '@aligent/aws-wrappers/testing';
import { S3Service } from '@aligent/aws-wrappers';
import { invokeApiGatewayHandler } from '@aligent/lambda-test-utils';
import { handler } from './create-order';

it('creates an order and stores it in S3', async () => {
    const putJsonObject = vi.fn().mockResolvedValue(undefined);
    const s3 = createMockService(S3Service, { putJsonObject });

    const response = await invokeApiGatewayHandler(
        (event, context) => handler(event, context, { s3 }),
        withJsonBody({ httpMethod: 'POST', path: '/orders' }, { sku: 'ABC-123', quantity: 2 })
    );

    expect(response.statusCode).toBe(201);
    expect(putJsonObject).toHaveBeenCalledOnce();
});
```

### Testing handlers with module-scope config

If a handler reads required config at module scope (e.g. `envVar('X').required().asString()`, evaluated once on first import), testing more than one config state means resetting the module cache and re-importing between tests:

```ts
beforeEach(() => {
    vi.resetModules();
});

it('handles the "not configured" case', async () => {
    process.env.SCHEDULE = '';
    const { handler } = await import('./handler.js');
    const response = await invokeApiGatewayHandler(handler, ...);
    ...
});
```

Watch out: if the same test file also has a **static** top-level import of a class the handler checks with `instanceof` (e.g. a shared error class used to construct a mock rejection), `vi.resetModules()` causes the next dynamic `import()` to load a *second, distinct* copy of that module. The handler's `instanceof` check then compares against the wrong class identity and silently fails — the mocked rejection propagates as an unhandled rejection instead of being caught and turned into a response, so the test fails with a raw rejection rather than the expected status code.

Two ways to avoid it:

-   Import the shared class dynamically too, inside the same `resetModules` cycle, instead of statically at the top of the file.
-   Put each config state in its own spec file — no shared module cache, no `resetModules()` needed.

## Testing & Linting

```sh
yarn test
yarn lint
```
