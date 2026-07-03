---
aws-wrappers: minor
---

- Add `SchedulerService` wrapping the AWS EventBridge Scheduler client (`@aws-sdk/client-scheduler`) with CRUD over schedules and schedule groups, following the package's Powertools-logging + X-Ray conventions. `Target.Input` is redacted from INFO-level logs.
