[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / logMiddleware

# Function: logMiddleware()

> **logMiddleware**(`clientName`, `logger`, `logLevel?`): `Middleware`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/log.ts:40](https://github.com/aligent/microservice-development-utilities/blob/bdd7e82de06e0611b27ae79005e5208ce3f07b51/packages/microservice-util-lib/src/openapi-fetch-middlewares/log.ts#L40)

Creates a logging middleware for openapi-fetch clients.

This middleware logs HTTP requests and responses with Content-Type handling.
It uses Powertools Logger for structured JSON output.

Features:
- Automatic Content-Type detection and appropriate parsing
- Support for JSON, text, XML, form data, and binary content
- Configurable log level (defaults to INFO)
- Structured JSON logging via Powertools Logger

## Parameters

### clientName

`string`

A descriptive name for the API client (used in log messages)

### logger

`LoggerInterface`

Logger instance implementing Powertools LoggerInterface

### logLevel?

[`LogMethod`](../type-aliases/LogMethod.md) = `'INFO'`

Which logger method to call (defaults to 'INFO')

## Returns

`Middleware`

An openapi-fetch middleware that logs requests and responses

## Examples

```typescript
import createClient from 'openapi-fetch';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'my-service' });
const client = createClient({ baseUrl: 'https://api.example.com' });
client.use(logMiddleware('MyAPI', logger));
```

```typescript
// Log at DEBUG level — only visible when the logger is configured for DEBUG
client.use(logMiddleware('MyAPI', logger, 'DEBUG'));
```
