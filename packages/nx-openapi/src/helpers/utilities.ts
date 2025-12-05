import { logger, readProjectConfiguration, Tree, updateJson } from '@nx/devkit';

/**
 * Get existing project by name.
 * If the project exists, it returns project configuration or undefined otherwise.
 *
 * @param tree - The file system tree representing the current project.
 * @param projectName - The name of the project to add.
 * @returns - The project configuration.
 */
export function getExistingProject(tree: Tree, projectName: string) {
    try {
        return readProjectConfiguration(tree, projectName);
    } catch (error) {
        logger.debug(`Project ${projectName} doesn't exist`, String(error));
        return undefined;
    }
}

/**
 * The utility functions below are only exported by '@nx/js', not '@nx/devkit'
 * They're simple so we recreate them here instead of adding '@nx/js' as a dependency
 * Source: {@link https://github.com/nrwl/nx/blob/master/packages/js/src/utils/typescript/ts-config.ts}
 */
export function getRootTsConfigPathInTree(tree: Tree): string {
    for (const path of ['tsconfig.base.json', 'tsconfig.json']) {
        if (tree.exists(path)) {
            return path;
        }
    }

    return 'tsconfig.base.json';
}

/**
 * Adds a new path mapping to the `compilerOptions.paths` property in the root TypeScript configuration file.
 * If the import path already exists, an error is thrown.
 *
 * @param tree - The file system tree representing the current project.
 * @param tsConfigFile - The root TypeScript configuration file path.
 * @param importPath - The import path to add to the `paths` property.
 * @param lookupPaths - The array of paths to associate with the import path.
 * @throws - If the import path already exists in the `paths` property.
 */
export function addTsConfigPath(
    tree: Tree,
    tsConfigFile: string,
    importPath: string,
    lookupPaths: string[]
) {
    updateJson(tree, tsConfigFile, json => {
        json.compilerOptions ??= {};
        const c = json.compilerOptions;
        c.paths ??= {};

        if (c.paths[importPath]) {
            throw new Error(
                `You already have a library using the import path "${importPath}". Make sure to specify a unique one.`
            );
        }

        c.paths[importPath] = lookupPaths;

        return json;
    });
}

/**
 * Adds a new referencing path to the `references` property in the root TypeScript configuration file.
 * If the referencing path already exists, an error is thrown.
 *
 * @param tree - The file system tree representing the current project.
 * @param tsConfigFile - The root TypeScript configuration file path.
 * @param referencePath - The referencing path.
 * @throws - If the import path already exists in the `paths` property.
 */
export function addTsConfigReference(tree: Tree, tsConfigFile: string, referencePath: string) {
    updateJson(tree, tsConfigFile, json => {
        json.references ??= [];

        if (json.references.some((r: { path: string }) => r.path === referencePath)) {
            throw new Error(
                `You already have a library using the import path "${referencePath}". Make sure to specify a unique one.`
            );
        }

        json.references.push({
            path: referencePath,
        });

        return json;
    });
}

/**
 * Appends a new export statement to the index file.
 *
 * This function reads the content of the index file and appends a new export statement
 * for the specified client.
 *
 * @param {Tree} tree - The file system tree representing the current project.
 * @param {string} clientName - The name of the client to export.
 */
export function appendToIndexFile(tree: Tree, projectRoot: string, clientName: string) {
    const indexPath = `${projectRoot}/src/index.ts`;
    const newLine = `export * from "./${clientName}/client";\n`;

    const indexContent = tree.read(indexPath, 'utf-8');
    tree.write(indexPath, indexContent + newLine);
}

/**
 * Convert a lower-case alphanumeric string (may include hyphens) into a PascalCase string.
 *
 * @param input - The input string to convert.
 * @example:
 *  - "my-client" -> "MyClient"
 */
export function toClassName(input: string): string {
    return input
        .trim()
        .toLowerCase()
        .split('-')
        .map(c => c.charAt(0).toUpperCase() + c.slice(1))
        .join('');
}
