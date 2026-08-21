---
aws-wrappers: minor
---

MI-336: New `@aligent/aws-wrappers/testing` subpath exporting `createMockService`, a dependency-free helper for stubbing a `*Service` in a consumer's unit tests.

Previously the only way to hand a handler a stand-in for a wrapper was `{ ... } as unknown as S3Service` in each test file — the services declare `private readonly client` / `private readonly logger`, so an object of stubs is not assignable to the class. That cast silently accepts a misspelled method name, and fails as `is not a function` when a method is missed. The helper removes it from consumer code: override keys are checked against the class's public surface, overridden keys keep the caller's spy type, and accessing an unmocked method throws `S3Service.headObject was accessed but not mocked`. See the `## Testing` section of the package README for a worked example.

Published on a subpath rather than the main entry so test-only code stays unreachable from the module consumers bundle into a Lambda. Additive only — no existing export or behaviour changes, and no new runtime dependencies.
