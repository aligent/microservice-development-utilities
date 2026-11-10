---
vite-plugin-handler: minor
nx-cdk: minor
---

Add Step Functions execution IDs to Lambda logs.

`@aligent/vite-plugin-handler`: new opt-in `stepFunctionExecutionId` option. When a state machine sends `stepFunctionExecutionId` (and optionally `rootStepFunctionExecutionId`) in the Lambda `ClientContext`, every Powertools Logger line written during that invocation gets both fields, with no handler code changes. Bundles built without the option are unchanged.

`@aligent/nx-cdk`: generated services enable the option, the base workspace now depends on `@aligent/vite-plugin-handler@^0.6.0`, and the `--example` state machine invokes the example Lambda with the execution ID in its ClientContext.
