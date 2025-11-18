# Nx Serverless

## [Obsolete] This package will be removed and replaced by a CDK generator. It's still here for referencing purpose only.

The `@aligent/nx-serverless` package provides Nx generators and plugin for serverless development.

## Generators

- We support the following types of generators: `init`, `service`, `link` and `unlink`

### Init generator

- The Init generator is triggered when we install this package via `nx add @aligent/nx-serverless` command.
- This generator automatically configures `@aligent/nx-serverless/plugin` for the workspace if it's not configured yet.

### Service generator

- The Service generator is used to generate Serverless services using our template.

- All generated services will be placed in the `services` folder. If the `services` folder does not exist, it will be created automatically.

- Our service generators requires a `brand` parameter which can be passed in when generating a service. However, for consistency, it's recommend that we configure the default value in `nx.json` file:

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "generators": {
    "@aligent/nx-serverless:service": {
      "brand": "brand-name"
    }
  }
}
```

##### General service:

- The general service is a minimum deployable service based on our predefined template. It serve as a starting point for serverless development.
- To generate a general service, run the command:
  ```bash
    nx generate @aligent/nx-serverless:service <service-name>
    # The command above is equivalent to 'nx g @aligent/nx-serverless:service <service-name> general'
  ```

##### Notification service:

- The notification service is designed to send messages to email or Slack channels when other services encounter errors. It helps in monitoring and alerting, ensuring quick responses to issues in the system.
- To generate a notification service, run the command:
  ```bash
    nx generate @aligent/nx-serverless:service <service-name> notification
  ```

### Link generator

- The Link generator is used to establish dependencies between projects in your workspace. It updates the `implicitDependencies` of the target projects to include the specified dependency projects.
- This ensures that the target projects are aware of their dependencies, which can help in managing build and deployment workflows.
- To use this generator, run the command and follow the prompt:
  ```bash
    nx generate @aligent/nx-serverless:link
  ```

### Unlink generator

- The Unlink generator is used to remove dependencies between projects in your workspace. It updates the `implicitDependencies` of the target projects by removing the specified dependency projects.
- To use this generator, run the command and follow the prompt:
  ```bash
    nx generate @aligent/nx-serverless:unlink
  ```

## Plugins

- The `nx-serverless` plugin identify our project by looking for `serverless.yml` file and `project.json` file. For each project it can find, the following targets are dynamically added to the project:
  - `build`: build the project using `serverless package` command.
  - `deploy`: deploy the project using `serverless deploy` command.
  - `remove`: remove the project using `serverless remove` command.
- These inferred targets rely on the project's `implicitDependencies` to manage workflows. This ensures that the build, deployment, and removal processes respect the dependencies between projects, enabling efficient and consistent workflows.

- To enable this feature, install this package by:
  ```bash
    nx add @aligent/nx-serverless
  ```
- If you installed this package by your package manager, you need to manually configure plugin by adding the configuration below to your `nx.json` file.
  ```json
    "plugins": [
        ... other plugins
        {
            "plugin": "@aligent/nx-serverless/plugin",
            "options": {}
        }
    ],
  ```
