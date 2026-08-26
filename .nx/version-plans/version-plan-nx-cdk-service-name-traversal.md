---
nx-cdk: patch
---

MI-331: Fix path traversal in the `service` and `remove-service` generators. Neither validated the `name` option before using it to build filesystem paths (`services/${name}`), and Nx's `Tree` does not sandbox `..` segments — a name like `../../etc` could write or delete files outside the `services/` directory, or outside the workspace entirely. Added a shared `assertValidServiceName` runtime guard restricting names to `[a-z0-9-]+`, plus matching `pattern` constraints on both generators' `schema.json` so the CLI prompt rejects an unsafe name up front.
