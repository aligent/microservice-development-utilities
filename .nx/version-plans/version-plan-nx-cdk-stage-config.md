---
nx-cdk: minor
---

MI-340: The preset now generates `libs/infra/src/config.ts` for non-secret, per-stage configuration, replacing SSM Parameter Store in the generated templates.

Values are plain strings keyed by CDK stage name, and `SharedInfraStack` reads them with `getStageConfig`, which fails synth if a stage has no config or a value is still `TODO`. Because the values are written straight into each service stack's template, changing one is a normal deploy. Values read from SSM in `SharedInfraStack` reached service stacks as CloudFormation exports, which can't change while another stack imports them ("Cannot update export ... as it is in use by ..."). Secrets stay in Secrets Manager.

With `--example`, the example `SharedInfraStack` now exposes `exampleBaseUrl: string` from `EXAMPLE_CONFIGURATIONS` instead of `paramExample: IStringParameter`. The example's `prd` value is left as `TODO`, so an example workspace won't synth `prd` until it's filled in. The infra and service README templates now document stage config instead of SSM.

Existing workspaces are unaffected. To adopt the pattern in one, add `libs/infra/src/config.ts` and read it in `SharedInfraStack` as described in the generated `libs/infra/README.md`.
