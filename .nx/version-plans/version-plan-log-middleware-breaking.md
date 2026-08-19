---
microservice-util-lib: major
---

microservice-util-lib:
- **BREAKING:** `logMiddleware` now requires a `LoggerInterface` from `@aws-lambda-powertools/logger` as the second argument. The default `console` logger has been removed. The `Logger` type is no longer exported; `LogLevel` has been replaced by `LogMethod` (Powertools `LogLevel` minus `'SILENT'`). An optional third `logLevel` parameter controls which logger method is called (defaults to `'INFO'`).
