# Microservice Development Utilities

Aligent's monorepo for Microservice Development Utilities. For more details about each package, check out the read me file for each of them.

# Packages

- [App Builder Util Lib](/packages/appbuilder-util-lib/README.md)
- [AWS Wrappers](/packages/aws-wrappers/README.md)
- [Create Workspace](/packages/create-workspace/README.md)
- [Lambda Test Utils](/packages/lambda-test-utils/README.md)
- [Microservice Util Lib](/packages/microservice-util-lib/README.md)
- [Nx App Builder](/packages/nx-appbuilder/README.md)
- [Nx CDK](/packages/nx-cdk/README.md)
- [Nx Openapi](/packages/nx-openapi/README.md)
- [Vite Plugin Handler](/packages/vite-plugin-handler/README.md)

# Development

## Prerequisites

- Node.js (v22 or higher recommended)
- [Corepack](https://nodejs.org/api/corepack.html) enabled (`corepack enable`) — this workspace uses Yarn Berry, pinned via the `packageManager` field in `package.json`

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/aligent/microservice-development-utilities.git
   cd microservice-development-utilities
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Git hooks will be automatically configured via the `postinstall` script.

## Project Structure

```
microservice-development-utilities/
├── packages/
│   ├── appbuilder-util-lib/    # Adobe App Builder utility library
│   ├── aws-wrappers/           # Opinionated AWS SDK wrappers with logging + X-Ray
│   ├── create-workspace/       # Workspace scaffolding tool
│   ├── lambda-test-utils/      # Test utilities for API Gateway Lambda handlers
│   ├── microservice-util-lib/  # Utility library for microservices
│   ├── nx-appbuilder/          # Nx plugin with generators for Adobe App Builder apps
│   ├── nx-cdk/                 # Nx plugin for CDK project generation
│   ├── nx-openapi/             # Nx plugin for OpenAPI code generation
│   ├── vite-plugin-handler/    # Vite plugin for bundling Lambda handlers
└── package.json                # Root package configuration
```

## Available Commands

This monorepo uses [Nx](https://nx.dev) for task orchestration.

- **Affected commands** (`yarn build`, `yarn test`, etc.) only run on packages that are affected by your changes since the last commit. This is faster and more efficient during development.
- **All commands** (`yarn build:all`, `yarn test:all`, etc.) run on every package in the monorepo regardless of changes.

## Local Package Testing

To test packages locally before publishing, you can use the local `verdaccio` registry. For more information about Verdaccio, check out [their documentation](https://verdaccio.org/docs/what-is-verdaccio).

```bash
# Start local registry
yarn nx start-local-registry microservice-development-utilities

# In another terminal, publish packages locally
yarn nx release publish

# Stop local registry when done
yarn nx stop-local-registry microservice-development-utilities
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
yarn nx g @tools/generators:package

# Preview changes without writing files
yarn nx g @tools/generators:package --dry-run
```

For more details, see [tools/generators/README.md](/tools/generators/README.md).

# Release Process

Each of the packages in the monorepo have separate versioning and independent npm releases. To perform a release of one or more packages we use [Version Plans](https://nx.dev/recipes/nx-release/file-based-versioning-version-plans) to define the type of updates and provide change log. Nx will then detect the version plans and automatically update version numbers appropriately, as well as perform builds and deployments separately in the pipeline if a version plan is detected.

## Important - First publish must be done manually

The first time a new package is published to `npm`, it must be published manually by a `maintainer`. Subsequent releases are then handled automatically by the release workflow. Contact with `DevOps` guild if you are not a maintainer of `@aligent/` on npm.

Our release workflow uses [OIDC trusted publishing](https://docs.npmjs.com/trusted-publishers). OIDC can only publish new versions of packages that already exist on npm — it cannot create a brand new package. The package name has to be registered on the npm registry before automated releases can take over.

To bootstrap a new package:

- Build the package locally: `yarn nx build <package-name>`
- From the package directory, log in to npm (npm login) with maintainer credentials and publish: `npm publish --access public`
- Once the package exists on npm, future versions will be released automatically by the workflow.

## Step-by-Step Guide for subsequence releases

1. Start by creating a new `release-pr/*` branch from the latest `main` branch.

2. Check if a version plan exist.
   - The version plan is a `version-plan-*.md` file in `.nx/version-plans` folder.
   - If the a version plan is already created, go to step #3.
   - If not exists, create a new version plan. You can use the following command to generate a version plan based on your changes:

     ```bash
     yarn release-plan
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

## API Documentation

Each package that ships generated API docs keeps a `docs/modules.md` index file checked into the repository. This file is the entry point that [typedoc](https://typedoc.org/) requires to exist before it can regenerate the per-symbol pages. The CI pipeline runs typedoc during the build to produce the full documentation set, so the individual class/function/interface pages are **not** committed — only `modules.md` is tracked.

## Notes

- Nx is responsible for removing the version plans after a release. This is because **having multiple version plan files may produce unpredictable results**. For this reason make sure not to commit more than one version plan file.
- Always use the provided command to generate version plan files for uniqueness and correctness.
