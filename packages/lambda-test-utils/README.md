# @aligent/lambda-test-utils

Small, dependency-light test utilities for asserting the input/output of API Gateway-attached Lambda handlers without standing up a real HTTP layer.

API Gateway handlers tend to get skipped by unit tests because they're treated as integration tests. This package builds a valid `APIGatewayProxyEvent` and Lambda `Context`, invokes your handler with them, and hands back a parsed response — so you can unit test the handler directly.

Scope is limited to input/output assertions. Mocking side effects (S3, DynamoDB, etc.) stays the test author's responsibility, outside this harness. There's no real HTTP-layer emulation (no supertest / local server).

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

## Testing & Linting

```sh
npm run test
npm run lint
```
