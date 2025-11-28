# Nx Cloud Development Kit

The `@aligent/nx-cdk` package provides Nx generators for AWS CDK development. It helps you scaffold new CDK projects and services within an Nx monorepo structure.

## Generators

### Preset Generator

The preset generator initializes a new CDK project with a complete workspace structure, including configuration files, build tools, and an application scaffold.

#### Usage

```bash
npx nx g @aligent/nx-cdk:preset <project-name> [options]
```

Or when creating a new workspace:

```bash
npx create-nx-workspace@latest --preset=@aligent/nx-cdk
```

#### Options

| Option        | Type   | Required | Default   | Description                                                                      |
| ------------- | ------ | -------- | --------- | -------------------------------------------------------------------------------- |
| `name`        | string | Yes      | -         | The name of the project/application (alphanumeric and dashes only)               |
| `nodeVersion` | string | No       | `24.11.0` | The target Node.js version for the project (must be valid semver, e.g., 22.10.0) |

#### What it creates

The preset generator scaffolds:

- **Root configuration files**:
  - `eslint.config.mjs` - ESLint configuration
  - `prettier.config.mjs` - Prettier configuration
  - `rsbuild.config.base.mjs` - Base RSBuild configuration
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
  - TypeScript configurations (`tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json`)

#### Example

```bash
# Create a new project named "my-cdk-app" with Node.js 22.10.0
npx nx g @aligent/nx-cdk:preset my-cdk-app --nodeVersion=22.10.0
```

### Service Generator

The service generator creates a new CDK service within the `services/` folder of your existing CDK project. Each service is configured as a separate package with its own build configuration and testing setup.

#### Usage

```bash
npx nx g @aligent/nx-cdk:service <service-name>
```

#### Options

| Option | Type   | Required | Description                                                               |
| ------ | ------ | -------- | ------------------------------------------------------------------------- |
| `name` | string | Yes      | The name of the service (cannot contain 'Stack' or 'Service' in the name) |

#### What it creates

The service generator creates a new service in `services/<service-name>/` with:

- **Service files**:
  - `src/index.ts` - Service entry point
  - `package.json` - Service-specific dependencies
  - `README.md` - Service documentation
  - `eslint.config.mjs` - ESLint configuration
  - `rsbuild.config.mjs` - RSBuild configuration
  - `vitest.config.mjs` - Vitest configuration
  - TypeScript configurations (`tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json`)

- **Root updates**:
  - Adds the service to the root `tsconfig.json` references for proper TypeScript project references

- **Application updates**:
  - Adds the stack to the main CDK application

#### Example

```bash
# Create a new service named "user-management"
npx nx g @aligent/nx-cdk:service user-management

# Create a new service named "payment-processing"
npx nx g @aligent/nx-cdk:service payment-processing
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
