import { addProjectConfiguration, Tree, updateJson } from '@nx/devkit';

/**
 * Attempts to add a new project configuration to the workspace.
 *
 * This function adds a new project configuration to the workspace. If a project with the same name
 * already exists, it returns `false`. If an error occurs for any other reason, the error is re-thrown.
 *
 * @param {Tree} tree - The file system tree representing the current project.
 * @param {string} name - The name of the project to add.
 * @param {string} projectRoot - The root directory of the project.
 * @returns {boolean} `true` if the project configuration was added successfully, `false` if the project already exists.
 * @throws {Error} If an error occurs that is not related to the project already existing.
 */
export function attemptToAddProjectConfiguration(tree: Tree, projectRoot: string) {
    try {
        addProjectConfiguration(tree, 'clients', {
            root: projectRoot,
            projectType: 'library',
            sourceRoot: `${projectRoot}/src`,
            targets: {},
            tags: ['clients'],
        });
        return true;
    } catch (err) {
        if (err instanceof Error && err.message.includes('already exists')) {
            return false;
        }

        throw err;
    }
}

/**
 * The utility functions below are only exported by '@nx/js', not '@nx/devkit'
 * They're simple so we recreate them here instead of adding '@nx/js' as a dependency
 * Source: {@link https://github.com/nrwl/nx/blob/master/packages/js/src/utils/typescript/ts-config.ts}
 */
function getRootTsConfigPathInTree(tree: Tree): string {
    for (const path of ['tsconfig.base.json', 'tsconfig.json']) {
        if (tree.exists(path)) {
            return path;
        }
    }

    return 'tsconfig.base.json';
}

/**
 * Adds a new path mapping to the `paths` property in the root TypeScript configuration file.
 *
 * This function updates the `tsconfig.base.json` or `tsconfig.json` file to include a new path mapping
 * for the specified import path. If the import path already exists, an error is thrown.
 *
 * @param {Tree} tree - The file system tree representing the current project.
 * @param {string} importPath - The import path to add to the `paths` property.
 * @param {string[]} lookupPaths - The array of paths to associate with the import path.
 * @throws {Error} If the import path already exists in the `paths` property.
 */
export function addTsConfigPath(tree: Tree, importPath: string, lookupPaths: string[]) {
    updateJson(tree, getRootTsConfigPathInTree(tree), json => {
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
 * Appends a new export statement to the index file.
 *
 * This function reads the content of the index file and appends a new export statement
 * for the specified client.
 *
 * @param {Tree} tree - The file system tree representing the current project.
 * @param {string} clientName - The name of the client to export.
 */
export function appendtoIndexFile(tree: Tree, projectRoot: string, clientName: string) {
    const indexPath = `${projectRoot}/src/index.ts`
    const newExport = `export * as ${clientName}Client from "./${clientName}/client"`

    const indexContent = tree.read(indexPath, 'utf-8');
    const newLine = '\n' + newExport + ';';
    tree.write(indexPath, indexContent + newLine);
}
