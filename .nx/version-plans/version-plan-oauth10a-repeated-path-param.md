---
microservice-util-lib: patch
---

MI-331: Fix `combineUrlAndPathParams` in the OAuth 1.0a signing middleware silently dropping repeated path placeholders. A path template referencing the same param twice (e.g. `/accounts/{id}/orders/{id}`) only had its first occurrence substituted, so the signature base string was built against a URL that was never actually requested — causing the server to reject the request as invalid.
