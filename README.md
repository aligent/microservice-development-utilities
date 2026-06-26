# Microservice Development Utilities

Aligent's monorepo for Microservice Development Utilities. For more details about each package, check out the read me file for each of them.

# Packages

- [App Builder Util Lib](/packages/appbuilder-util-lib/README.md)
- [AWS Wrappers](/packages/aws-wrappers/README.md)
- [Create Workspace](/packages/create-workspace/README.md)
- [Microservice Util Lib](/packages/microservice-util-lib/README.md)
- [Nx App Builder](/packages/nx-appbuilder/README.md)
- [Nx CDK](/packages/nx-cdk/README.md)
- [Nx Openapi](/packages/nx-openapi/README.md)
- [Vite Plugin Handler](/packages/vite-plugin-handler/README.md)

# Development

## Prerequisites

- Node.js (v22 or higher recommended)
- npm (v10 or higher)

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/aligent/microservice-development-utilities.git
   cd microservice-development-utilities
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Git hooks will be automatically configured via the `prepare` script.

## Project Structure

```
microservice-development-utilities/
├── packages/
│   ├── appbuilder-util-lib/    # Adobe App Builder utility library
│   ├── aws-wrappers/           # Opinionated AWS SDK wrappers with logging + X-Ray
│   ├── create-workspace/       # Workspace scaffolding tool
│   ├── microservice-util-lib/  # Utility library for microservices
│   ├── nx-appbuilder/          # Nx plugin with generators for Adobe App Builder apps
│   ├── nx-cdk/                 # Nx plugin for CDK project generation
│   ├── nx-openapi/             # Nx plugin for OpenAPI code generation
│   ├── vite-plugin-handler/    # Vite plugin for bundling Lambda handlers
└── package.json                # Root package configuration
```

## Available Commands

This monorepo uses [Nx](https://nx.dev) for task orchestration.

- **Affected commands** (`npm run build`, `npm test`, etc.) only run on packages that are affected by your changes since the last commit. This is faster and more efficient during development.
- **All commands** (`npm run build:all`, `npm run test:all`, etc.) run on every package in the monorepo regardless of changes.

### Build

```bash
# Build only affected packages
npm run build

# Build all packages
npm run build:all
```

### Test

```bash
# Run tests on affected packages with coverage
npm test

# Run tests on all packages with coverage
npm run test:all
```

### Lint

```bash
# Lint affected packages
npm run lint

# Lint all packages
npm run lint:all
```

### Type Checking

```bash
# Type check affected packages
npm run check-types

# Type check all packages
npm run check-types:all
```

## Working with Nx

You can also run Nx commands directly:

```bash
# Run a specific task on a specific package
npx nx build @aligent/microservice-util-lib

# Run a task on all packages
npx nx run-many -t build

# View the project graph
npx nx graph
```

## Local Package Testing

To test packages locally before publishing, you can use the local `verdaccio` registry. For more information about Verdaccio, check out [their documentation](https://verdaccio.org/docs/what-is-verdaccio).

```bash
# Start local registry
npx nx start-local-registry microservice-development-utilities

# In another terminal, publish packages locally
npx nx release publish

# Stop local registry when done
npx nx stop-local-registry microservice-development-utilities
```

## Adding New Packages

This monorepo includes a generator to create new packages with all the necessary boilerplate. The generator sets up:

- Package configuration with `@aligent` scope
- TypeScript configuration
- Testing setup with Vitest
- ESLint configuration
- Example source code and tests
- Integration with the root `tsconfig.json`

### Usage

```bash
# To generate a new package, run this command and follow the prompt
npx nx g @tools/generators:package

# Preview changes without writing files
npx nx g @tools/generators:package --dry-run
```

For more details, see [tools/generators/README.md](/tools/generators/README.md).

# Release Process

Each of the packages in the monorepo have separate versioning and independent npm releases. To perform a release of one or more packages we use [Version Plans](https://nx.dev/recipes/nx-release/file-based-versioning-version-plans) to define the type of updates and provide change log. Nx will then detect the version plans and automatically update version numbers appropriately, as well as perform builds and deployments separately in the pipeline if a version plan is detected.

## Important - First publish must be done manually

The first time a new package is published to `npm`, it must be published manually by a `maintainer`. Subsequent releases are then handled automatically by the release workflow. Contact with `DevOps` guild if you are not a maintainer of `@aligent/` on npm.

Our release workflow uses [OIDC trusted publishing](https://docs.npmjs.com/trusted-publishers). OIDC can only publish new versions of packages that already exist on npm — it cannot create a brand new package. The package name has to be registered on the npm registry before automated releases can take over.

To bootstrap a new package:

- Build the package locally: `npx nx build <package-name>`
- From the package directory, log in to npm (npm login) with maintainer credentials and publish: `npm publish --access public`
- Once the package exists on npm, future versions will be released automatically by the workflow.

## Step-by-Step Guide for subsequence releases

1. Start by creating a new `release-pr/*` branch from the latest `main` branch.

2. Check if a version plan exist.
   - The version plan is a `version-plan-*.md` file in `.nx/version-plans` folder.
   - If the a version plan is already created, go to step #3.
   - If not exists, create a new version plan. You can use the following command to generate a version plan based on your changes:

     ```bash
     npm run release-plan
     ```

     Follow the prompts to select the type of change (patch, minor, major, etc.) and provide a description for each affected package. This will create a version plan file in the repository.

3. Double check your release plan then commit and push your changes to the newly created `release-pr/*` branch.
   - Ensure your change contains only one version plan file.
   - This will trigger the `release` workflow. The workflow will:
     - Detect the version plan file.
     - Release a new version without publishing to NPM.
     - Push the necessary changes to your `release-pr/*` branch.
     - Remove the version plan file after a successful releasing.
     - Open a "Publish" pull request targeting the `main` branch.

4. Once the "Publish" PR is approved, merge into `main`.
   - The `publish` workflow will build and publish the released packages to NPM.

5. For First Releases only, you need to trigger the `publish` workflow manually (via Github Action UI) and pass in `--first-release` flag. For more information, please check Nx documentation on [Publishing First Releases](https://nx.dev/reference/core-api/nx/documents/release#publish)

## Notes

- Nx is responsible for removing the version plans after a release. This is because **having multiple version plan files may produce unpredictable results**. For this reason make sure not to commit more than one version plan file.
- Always use the provided command to generate version plan files for uniqueness and correctness.
