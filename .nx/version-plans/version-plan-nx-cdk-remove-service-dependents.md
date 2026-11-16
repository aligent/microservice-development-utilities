---
nx-cdk: patch
---

MI-331: Fix `remove-service` refusing to remove any service without `--forceRemove`. The dependency check counted the main `application` as a dependent, but the application always references a service the `service` generator created, and the generator removes those references itself. The check now ignores the application and still blocks on any other dependent.
