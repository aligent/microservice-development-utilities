# Microservice Development Utilities

Aligent's monorepo for Microservice Development Utilities. For more details about each package, check out the read me file for each of them.

# Packages

- [Microservice Util Lib](/packages/microservice-util-lib/README.md)
- [Nx CDK](/packages/nx-cdk/README.md)
- [Nx Openapi](/packages/nx-openapi/README.md)
- [Nx Serverless](/packages/nx-serverless/README.md) (obsoleted)

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

### Note

- At the moment, we do not include `verdaccio` in our dev dependencies yet because of [CVE-2025-56200]https://github.com/advisories/GHSA-9965-vmph-33xx vulnerable in one of Verdaccio v6.2.1 dependencies. It will be added back once they resolve the issue. For now, we will need to add it in when we use it and remove it before making a PR.

## Project Structure

```
microservice-development-utilities/
├── packages/
│   ├── microservice-util-lib/  # Utility library for microservices
│   ├── nx-cdk/                 # Nx plugin for CDK project generation
│   ├── nx-openapi/             # Nx plugin for OpenAPI code generation
│   └── nx-serverless/          # Nx plugin for Serverless project generation (obsoleted)
└── package.json                # Root package configuration
```

# Release Process

Each of the packages in the monorepo have separate versioning and independent npm releases. To perform a release of one or more packages we use [Version Plans](https://nx.dev/recipes/nx-release/file-based-versioning-version-plans) to define the type of updates and provide change log. Nx will then detect the version plans and automatically update version numbers appropriately, as well as perform builds and deployments separately in the pipeline if a version plan is detected.

## Step-by-Step Guide

1. Start by creating a new `releases/*` branch from the latest `main` branch.

2. Check if a version plan exist.
   - The version plan is a `version-plan-*.md` file in `.nx/version-plans` folder.
   - If the a version plan is already created, go to step #3.
   - If not exists, create a new version plan. You can use the following command to generate a version plan based on your changes:

     ```bash
     npm run release-plan
     ```

     Follow the prompts to select the type of change (patch, minor, major, etc.) and provide a description for each affected package. This will create a version plan file in the repository.

3. Double check your release plan then commit and push your changes to the newly created `releases/*` branch.
   - Ensure your change contains only one version plan file.
   - This will trigger the `release` workflow. The workflow will:
     - Detect the version plan file.
     - Release a new version without publishing to NPM.
     - Push the necessary changes to your `releases/*` branch.
     - Remove the version plan file after a successful releasing.
     - Open a "Publish" pull request targeting the `main` branch.

4. Once the "Publish" PR is approved, merge into `main`.
   - The `publish` workflow will build and publish the released packages to NPM.

5. For First Releases only, you need to trigger the `publish` workflow manually (via Github Action UI) and pass in `--first-release` flag. For more information, please check Nx documentation on [Publishing First Releases](https://nx.dev/reference/core-api/nx/documents/release#publish)

## Notes

- Nx is responsible for removing the version plans after a release. This is because **having multiple version plan files may produce unpredictable results**. For this reason make sure not to commit more than one version plan file.
- Always use the provided command to generate version plan files for uniqueness and correctness.
