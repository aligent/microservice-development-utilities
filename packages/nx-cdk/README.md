# Nx Cloud Development Kit

The `@aligent/nx-cdk` package provides Nx generators for AWS CDK development. It helps you scaffold new CDK projects and services within an Nx monorepo structure.

## Generators

### Preset Generator

The preset generator initializes a new CDK project with a complete workspace structure, including configuration files, build tools, and an application scaffold. It is invoked indirectly via either `@aligent/create-workspace` (the Aligent-flavoured wrapper) or vanilla `create-nx-workspace`.

#### Usage

```bash
# Recommended: the Aligent wrapper. Requires corepack to be enabled.
npx @aligent/create-workspace@latest --preset=@aligent/nx-cdk

# Or directly via create-nx-workspace (will prompt for nodeVersion if omitted):
npx create-nx-workspace@latest --preset=@aligent/nx-cdk
```

> The `@aligent/create-workspace` wrapper calls `create-nx-workspace` under the hood, prompts for the preset's options (workspace name, target Node.js version), and removes the npm-bootstrap artefacts (`package-lock.json`, `node_modules`, `.nx`) afterwards so the workspace is ready for `yarn install`.

#### Options

| Option        | Type   | Required | Default   | Description                                                                      |
| ------------- | ------ | -------- | --------- | -------------------------------------------------------------------------------- |
| `name`        | string | Yes      | -         | The name of the project/application (alphanumeric and dashes only)               |
| `nodeVersion` | string | No       | `24.11.0` | The target Node.js version for the project (must be valid semver, e.g., 22.10.0) |

#### Post-generation setup

After running the preset generator, review these defaults before committing:

- **AWS profile** — The `pg:synth`, `pg:deploy`, `pg:diff`, and `pg:destroy` scripts in `package.json` use `--profile playground`. This assumes a profile named `playground` exists in your `~/.aws/config`. Update the profile name in the `pg:*` scripts if yours differs.
- **`.github/CODEOWNERS`** — The generated file references Aligent's GitHub teams (`@aligent/microservices`, `@aligent/devops`). Replace these with your organisation's team handles.

#### What it creates

The preset generator scaffolds:

- **Root configuration files**:
  - `eslint.config.mjs` - ESLint configuration
  - `prettier.config.mjs` - Prettier configuration
  - `vite.config.base.mjs` - Base Vite configuration, with the Vitest settings each service extends
  - `vitest.global.setup.mjs` - Global Vitest setup
  - `tsconfig.json` - Root TypeScript configuration
  - `nx.json` - Nx workspace configuration
  - `package.json` - Project dependencies and scripts
  - `cdk-config.yml` - CDK configuration
  - `LICENSE` - Project license

- **Application folder** (`application/`):
  - `cdk.json` - CDK app configuration
  - `cdk.context.json` - CDK context
  - `bin/main.ts` - CDK app entry point
  - `lib/service-stacks.ts` - Service stacks definition
  - TypeScript configurations (`tsconfig.json`, `tsconfig.spec.json`)

### Service Generator

The service generator creates a new CDK service within the `services/` folder of your existing CDK project. Each service is configured as a separate package with its own build configuration and testing setup.

#### Usage

```bash
yarn nx g @aligent/nx-cdk:service <service-name>

# Or simply (since the generator name is unique):
yarn nx g service <service-name>
```

#### Options

| Option    | Type    | Required | Default | Description                                                               |
| --------- | ------- | -------- | ------- | ------------------------------------------------------------------------- |
| `name`    | string  | Yes      | -       | The name of the service (cannot contain 'Stack' or 'Service' in the name) |
| `example` | boolean | No       | `false` | Generate example code with sample resources                               |

#### What it creates

The service generator creates a new service in `services/<service-name>/` with:

- **Service files**:
  - `src/index.ts` - Service entry point
  - `package.json` - Service-specific dependencies
  - `README.md` - Service documentation
  - `eslint.config.mjs` - ESLint configuration
  - `vite.config.mjs` - Lambda handler bundling (via `@aligent/vite-plugin-handler`) and Vitest configuration
  - TypeScript configurations (`tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json`)

- **Root updates**:
  - Adds the service to the root `tsconfig.json` references for proper TypeScript project references

- **Application updates**:
  - Adds the stack to the main CDK application

#### Example

```bash
# Create a new service named "user-management" (short form)
yarn nx g service user-management

# Or with the full plugin prefix
yarn nx g @aligent/nx-cdk:service user-management
```

#### Step Functions execution IDs in logs

Generated services bundle their handlers with the `stepFunctionExecutionId` option of `@aligent/vite-plugin-handler` enabled. When a Step Function passes its execution ID to a Lambda through the Lambda `ClientContext`, every Powertools Logger line the Lambda writes during that invocation gets `stepFunctionExecutionId` and `rootStepFunctionExecutionId` fields, with no handler code changes. Query a single execution's logs with Logs Insights:

```
filter stepFunctionExecutionId = "<execution ARN>"
```

Each Lambda Task in a state machine definition has to send the ID. In JSONata:

```yaml
Arguments:
  FunctionName: ${MyLambda}
  Payload: '{% $states.input %}'
  ClientContext: '{% $base64encode($string({"custom": {"stepFunctionExecutionId": $states.context.Execution.Id}})) %}'
```

`rootStepFunctionExecutionId` defaults to `stepFunctionExecutionId`. For work that runs in a child execution (Distributed Map items, nested `StartExecution`), pass the parent's ID down in the child's input and add it to the `custom` object as `rootStepFunctionExecutionId` so the child's logs group under the top-level execution. See the `@aligent/vite-plugin-handler` README for details. The `--example` service includes a working state machine.

##### Adding it to an existing service

Services generated before `@aligent/nx-cdk` 0.11.0 don't have this enabled. To add it:

1. **Upgrade the plugin.** In the workspace root `package.json`, set `"@aligent/vite-plugin-handler": "^0.6.0"` and run `yarn install`. Older versions ignore the option without any warning.

2. **Turn on the option** in `services/<service-name>/vite.config.mjs`:

   ```diff
   - plugins: [handlerBundle('src/runtime/handlers')],
   + plugins: [handlerBundle('src/runtime/handlers', { stepFunctionExecutionId: true })],
   ```

   Services that still have a `rolldown.config.mjs` were generated before the switch to Vite and don't use this plugin. Move them to the `vite.config.mjs` setup first.

3. **Log with Powertools.** Only lines from `Logger` in `@aws-lambda-powertools/logger` get the fields. That includes child loggers and the loggers `@aligent/aws-wrappers` creates. `console.*` output doesn't. Handler code doesn't otherwise change.

4. **Send the ID from each Lambda Task** in the state machine definition. The Task has to use the `lambda:invoke` integration:

   ```yaml
   MyStep:
     Type: Task
     Resource: arn:aws:states:::lambda:invoke
     Arguments:
       FunctionName: ${MyLambda}
       Payload: '{% $states.input %}'
       ClientContext: '{% $base64encode($string({"custom": {"stepFunctionExecutionId": $states.context.Execution.Id}})) %}'
     Output: '{% $states.result.Payload %}'
   ```

   - If the Task uses the function ARN directly (`Resource: ${MyLambda}`), it can't send a `ClientContext`. Change it to the form above. `lambda:invoke` wraps the response in `{ Payload, StatusCode, ... }`, so keep the `Output` line or the next state receives a different shape.
   - `${MyLambda}` is filled in by `StepFunctionFromFile` when the function is passed in `lambdaFunctions`. That prop also grants the state machine permission to invoke it:

     ```ts
     new StepFunctionFromFile(this, 'MyStepFunction', {
         baseDir: import.meta.dirname,
         filepath: 'infra/stepfunctions/my-step-function.yml',
         lambdaFunctions: [myLambda],
     });
     ```

   - For JSONPath definitions (no `QueryLanguage: JSONata`), build the JSON with `States.Format` and use `OutputPath: $.Payload`:

     ```yaml
     Parameters:
       FunctionName: ${MyLambda}
       Payload.$: $
       ClientContext.$: "States.Base64Encode(States.Format('\\{\"custom\":\\{\"stepFunctionExecutionId\":\"{}\"\\}\\}', $$.Execution.Id))"
     OutputPath: $.Payload
     ```

5. **Deploy and check.** Start an execution, then run this in Logs Insights on the Lambda's log group:

   ```
   fields @timestamp, message, stepFunctionExecutionId, rootStepFunctionExecutionId
   | filter stepFunctionExecutionId = "<execution ARN>"
   ```

   If the fields are missing, check that `dist/<handler>/index.mjs` contains `patchPowertoolsLogger`. If it doesn't, the installed plugin is older than 0.6.0 or the option isn't set. Also check that the build didn't print `Unrecognised Powertools Logger module`.

### Remove Service Generator

The remove-service generator cleanly removes a service and all of its references from the project. It reverses the changes made by the service generator, ensuring no dangling imports or references are left behind.

#### Usage

```bash
yarn nx g @aligent/nx-cdk:remove-service <service-name>

# Or simply (since the generator name is unique):
yarn nx g remove-service <service-name>
```

#### Options

| Option        | Type    | Required | Default | Description                                     |
| ------------- | ------- | -------- | ------- | ----------------------------------------------- |
| `name`        | string  | Yes      | -       | The name of the service to remove               |
| `forceRemove` | boolean | No       | `false` | Skip dependency check when removing the project |

#### What it does

The remove generator performs the following cleanup:

- **Application updates**:
  - Removes the service's import declaration from `application/lib/service-stacks.ts`
  - Removes the stack instantiation from the `ApplicationStage` constructor

- **Root updates**:
  - Removes the service from the root `tsconfig.json` references
  - Removes the service from the root `package.json` workspaces (if present)

- **Service files**:
  - Deletes the entire `services/<service-name>/` directory

#### Example

```bash
# Remove the "user-management" service (short form)
yarn nx g remove-service user-management

# Or with the full plugin prefix
yarn nx g @aligent/nx-cdk:remove-service user-management
```

## Project Structure

After using both generators, your project structure will look like:

```
my-cdk-app/
├── application/
│   ├── bin/
│   │   └── main.ts
│   ├── lib/
│   │   └── service-stacks.ts
│   ├── _internal/
│   │   ├── version-functions-aspect.ts
│   │   ├── nodejs-function-defaults-injector.ts
│   │   ├── step-function-defaults-injector.ts
│   │   ├── log-group-defaults-injector.ts
│   │   └── microservice-checks.ts
│   ├── cdk.json
│   ├── cdk.context.json
│   └── package.json
├── services/
│   ├── user-management/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── ...
│   └── payment-processing/
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── ...
├── nx.json
├── package.json
└── tsconfig.json
```

## License

MIT
