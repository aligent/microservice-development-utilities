[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / logMiddleware

# Function: logMiddleware()

> **logMiddleware**(`clientName`, `logLevel?`, `logger?`): `Middleware`

Defined in: [packages/microservice-util-lib/src/openapi-fetch-middlewares/log.ts:57](https://github.com/aligent/microservice-development-utilities/blob/abc9d337f3d99af75f0aee53a8dae4dfd3173b99/packages/microservice-util-lib/src/openapi-fetch-middlewares/log.ts#L57)

Creates a logging middleware for openapi-fetch clients.

This middleware logs HTTP requests and responses with Content-Type handling.
It supports various logger implementations and configurable log levels (INFO or DEBUG).

Features:
- Automatic Content-Type detection and appropriate parsing
- Support for JSON, text, XML, form data, and binary content
- Configurable log levels (INFO/DEBUG)
- Compatible with multiple logging libraries

## Parameters

### clientName

`string`

A descriptive name for the API client (used in log messages)

### logLevel?

[`LogLevel`](../type-aliases/LogLevel.md) = `'INFO'`

The logging level to use: 'INFO' (default) or 'DEBUG'

### logger?

[`Logger`](../interfaces/Logger.md) = `console`

Logger instance implementing the Logger interface (defaults to console)

## Returns

`Middleware`

An openapi-fetch middleware that logs requests and responses

## Examples

```typescript
// Basic usage with default console logger at INFO level
import createClient from 'openapi-fetch';

const client = createClient({ baseUrl: 'https://api.example.com' });
client.use(logMiddleware('MyAPI'));
```

```typescript
// Using DEBUG level with console
client.use(logMiddleware('MyAPI', 'DEBUG'));
```

```typescript
// Custom logger implementation
const customLogger = {
  info: (msg, ...args) => console.log('[INFO]', msg, ...args),
  debug: (msg, ...args) => console.log('[DEBUG]', msg, ...args)
};

client.use(logMiddleware('MyAPI', 'DEBUG', customLogger));
```
