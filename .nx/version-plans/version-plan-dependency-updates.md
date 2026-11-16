---
appbuilder-util-lib: patch
aws-wrappers: patch
create-workspace: patch
lambda-test-utils: patch
microservice-util-lib: patch
nx-appbuilder: patch
nx-cdk: patch
nx-openapi: patch
vite-plugin-handler: patch
---

Update dependencies across all packages.

`appbuilder-util-lib` moves `@adobe/aio-lib-db` from `0.1.0-beta` to `1.1.0`. `nx-openapi` moves `@redocly/openapi-core` and `ts-morph` to their next major versions; Redocly 2 is ESM-only, so it is now loaded with a dynamic `import()` inside `validateSchema`. Consumers with a `redocly.yaml` should check it against Redocly's v2 configuration changes. `nx-cdk` raises the dependency versions written into generated workspaces, including `@aligent/cdk-aspects` (`^0.8.1`), `@aligent/cdk-nodejs-function-from-entry` (`^0.3.0`) and `@aligent/vite-plugin-handler` (`^0.5.3`). `nx-appbuilder` raises `type-fest` in generated apps to `^5.10.0`.
