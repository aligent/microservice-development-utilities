---
appbuilder-util-lib: patch
aws-wrappers: patch
create-workspace: patch
nx-appbuilder: patch
nx-cdk: patch
nx-openapi: patch
vite-plugin-handler: patch
---

Update dependencies across packages.

`aws-wrappers` moves its AWS SDK clients to `^3.1174.0`, `appbuilder-util-lib` moves `mongodb` to `^7.9.1`, and `nx-openapi` moves `@redocly/openapi-core` to `^2.82.0`. Every package that depends on `tslib` raises it to `^2.9.1`.
