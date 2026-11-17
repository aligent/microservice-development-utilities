---
aws-wrappers: minor
---

MI-331: `SSMService.getParameters` accepts `{ required: true }` to throw when any requested parameter does not exist, instead of silently returning `undefined` for a typo'd path.

Every chunk is still sent, then a single `BatchOperationError` is thrown naming every missing parameter: `failed[].id` is the parameter path, `failed[].code` is `ParameterNotFound` and `failed[].message` names the alias. Without the option, behaviour is unchanged. The TSDoc and README now document that `getParameter` throws on a missing parameter while `getParameters` returns `undefined` unless `required` is set.
