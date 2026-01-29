# @aligent/create-workspace

A command-line tool for creating new Nx workspaces with opinionated presets and configurations. This tool wraps `create-nx-workspace` and provides a streamlined experience for initializing Aligent microservice projects.

## Features

- Interactive prompts for workspace configuration
- Support for custom Nx presets (e.g., `@aligent/nx-cdk`)
- Automatic workspace cleanup (removes unnecessary files)
- Built-in validation for workspace names and presets

## Prerequisites

- **Node.js**: v16.9 or higher (LTS recommended)
- **Corepack**: Must be enabled on your system

### Enable Corepack

Corepack is included with Node.js 16.9+ but needs to be enabled:

```sh
corepack enable
```

For more information, visit the [official Corepack documentation](https://nodejs.org/api/corepack.html).

## Usage

### Using npx (Recommended)

Run the tool directly without installation:

```sh
npx @aligent/create-workspace
```

### Global Installation

Install globally for repeated use:

```sh
npm install -g @aligent/create-workspace
create-workspace
```

### Interactive Mode

Simply run the command and follow the prompts:

```sh
npx @aligent/create-workspace
```

You'll be asked to provide:
1. **Preset**: The Nx preset to use (e.g., `@aligent/nx-cdk`)
2. **Workspace name**: Must contain only lowercase letters, numbers, and hyphens

### CLI Arguments

Skip the interactive prompts by providing arguments:

```sh
npx @aligent/create-workspace --preset @aligent/nx-cdk --name my-workspace
```

#### Available Options

| Option | Type | Description | Example |
|--------|------|-------------|---------|
| `--preset` | string | The Nx preset to use (supports version pinning) | `@aligent/nx-cdk@1.0.0` |
| `--name` | string | The workspace name (lowercase, alphanumeric, hyphens only) | `my-app` |
| `--debug` | boolean | Keep failed workspace directory for debugging | `--debug` |
| `--version` | - | Show version number | - |
| `--help` | - | Show help | - |

### Examples

Create a workspace with the default CDK preset:

```sh
npx @aligent/create-workspace --preset @aligent/nx-cdk --name my-cdk-app
```

Create a workspace with a specific preset version:

```sh
npx @aligent/create-workspace --preset @aligent/nx-cdk@1.2.3 --name my-app
```

## What Happens During Creation

1. Validates prerequisites (Corepack availability)
2. Collects workspace configuration (preset and name)
3. Creates Nx workspace using the specified preset
4. Cleans up unnecessary files:
   - `package-lock.json` (in favor of Yarn)
   - `.nx` cache directory
   - `.vscode` settings
   - `node_modules` (to be reinstalled with Yarn)
5. Displays next steps for getting started

## Next Steps After Creation

After successful workspace creation, follow these steps:

```sh
# Navigate to your workspace
cd your-workspace-name

# Activate the Node.js version
nvm use

# Install dependencies
yarn install
```

## Development

This package is written in TypeScript and built using Nx.

### Build

```sh
npm install
npm run build
```

### Testing & Linting

Run tests, linting, and type-checking:

```sh
npm run test
```

## License

MIT

## Repository

[microservice-development-utilities](https://github.com/aligent/microservice-development-utilities)
