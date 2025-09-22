# Microservice Development Utilities

Aligent's monorepo for Microservice Development Utilities. For more details about each package, check out the read me file for each of them.

# Packages

- [Microservice Util Lib](/packages/microservice-util-lib/README.md)
- [Nx Openapi](/packages/nx-openapi/README.md)
- [Nx Serverless](/packages/nx-serverless/README.md)

# Release Process

Each of the packages in the monorepo have separate versioning and independent npm releases. To perform a release of one or more packages we use [Version Plans](https://nx.dev/recipes/nx-release/file-based-versioning-version-plans) to define the type of updates and provide change log. Nx will then detect the version plans and automatically update version numbers appropriately, as well as perform builds and deployments separately in the pipeline if a version plan is detected.

### Step-by-Step Guide

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

5. For First Releases only, you need to trigger the `publish` workflow manually (via Github Action UI) and pass in `--first-release` flag. For mor information, please check Nx documentation on [Publishing First Releases](https://nx.dev/reference/core-api/nx/documents/release#publish)

### Notes

- The `release` pipeline will fail if a version plan is not present in your merged changes. However, the `pull-request` pipeline does not check for version plan. We do this as there might be situations where we want to commit to main without a release.
- Nx is responsible for removing the version plans after a release. This is because **having multiple version plan files may produce unpredictable results**. For this reason make sure not to commit more than one version plan file.
- Always use the provided command to generate version plan files for uniqueness and correctness.
