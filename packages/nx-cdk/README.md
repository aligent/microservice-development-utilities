# Nx Cloud Development Kit

The `@aligent/nx-cdk` package provides Nx generators for AWS CDK development. It helps you scaffold new CDK projects and services within an Nx monorepo structure.

## Generators

### Preset Generator

The preset generator initializes a new CDK project with a complete workspace structure, including configuration files, build tools, and an application scaffold.

#### Usage

```bash
npx create-nx-workspace@latest --preset=@aligent/nx-cdk
```

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
  - `rolldown.config.base.mjs` - Base Rolldown configuration
  - `vitest.config.base.mjs` - Base Vitest configuration
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
  - `rolldown.config.mjs` - Rolldown configuration
  - `vitest.config.mjs` - Vitest configuration
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
