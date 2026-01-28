# Generators

This directory contains local Nx generators for this workspace.

## Available Generators

### Package Generator

Generates a new package in the monorepo with all the necessary boilerplate files.

#### Usage

```bash
# To generate a new package, run this command and follow the prompt
npx nx g @tools/generators:package

# Preview changes without writing files
npx nx g @tools/generators:package --dry-run
```

#### Options

- `name` (required): The name of the package (without @aligent/ scope)
  - Must start with a lowercase letter
  - Can only contain lowercase letters, numbers, and hyphens

- `description` (required): A brief description of the package

#### What Gets Generated

The generator creates:

- `package.json` - Package configuration with @aligent scope
- `project.json` - Nx project configuration
- `tsconfig.json` - TypeScript configuration (root)
- `tsconfig.lib.json` - TypeScript configuration for library code
- `tsconfig.spec.json` - TypeScript configuration for tests
- `vitest.config.mjs` - Vitest testing configuration
- `eslint.config.mjs` - ESLint configuration
- `README.md` - Package documentation
- `src/index.ts` - Main entry point
- `src/lib/hello.ts` - Example library code
- `src/lib/hello.spec.ts` - Example test file

It also:

- Adds a TypeScript project reference to the root `tsconfig.json`
- Formats all generated files according to the workspace Prettier configuration

## Creating Additional Generators

To create additional generators:

1. Create a new directory under `tools/generators/` (e.g., `tools/generators/my-generator/`)
2. Add the following files:
   - `schema.json` - JSON schema defining generator options
   - `schema.d.ts` - TypeScript types for the schema
   - `generator.ts` - Generator implementation (must export default function)
   - `files/` - Template files directory (optional)

3. Register the generator in `tools/generators/generators.json`

4. Run your generator:
   ```bash
   npx nx g @tools/generators:my-generator
   ```

## Template Files

Template files in the `files/` directory use EJS syntax:

- `<%= variableName %>` - Interpolate a variable
- File names ending with `__template__` will have that suffix removed
- Directory structure in `files/` is preserved in the generated output

## Resources

- [Nx Workspace Generators Documentation](https://nx.dev/extending-nx/recipes/local-generators)
- [Nx Devkit API](https://nx.dev/nx-api/devkit)
