---
microservice-util-lib: patch
---

Update `fast-xml-parser` to `5.12.1`, which fixes quadratic rescanning of malformed attributes in its XML validator (AIKIDO-2026-725485). `microservice-util-lib` doesn't enable validation, so it wasn't exposed, but consumers' security checks flag the pinned `5.12.0`.
