import { writeJson, type Tree } from '@nx/devkit';
import type { NormalizedSchema } from '../schema';

/**
 * Writes the Nx project.json into the new app's directory using the same
 * target shape that the existing apps in the monorepo use.
 */
export function writeProjectJson(tree: Tree, options: NormalizedSchema): void {
    const projectJson = {
        name: options.name,
        $schema: '../node_modules/nx/schemas/project-schema.json',
        projectType: 'application' as const,
        sourceRoot: `${options.appRoot}/src`,
        targets: {
            lint: {
                executor: 'nx:run-commands',
                options: {
                    command: 'npm run lint',
                    cwd: options.appRoot,
                },
            },
            'lint:fix': {
                executor: 'nx:run-commands',
                options: {
                    command: 'npm run lint:fix',
                    cwd: options.appRoot,
                },
            },
            'check-types': {
                executor: 'nx:run-commands',
                options: {
                    command: 'npm run check-types',
                    cwd: options.appRoot,
                },
            },
            test: {
                executor: 'nx:run-commands',
                options: {
                    command: 'npm test',
                    cwd: options.appRoot,
                },
            },
            deploy: {
                executor: 'nx:run-commands',
                options: {
                    command: 'aio app deploy',
                    cwd: options.appRoot,
                },
            },
        },
    };

    writeJson(tree, `${options.appRoot}/project.json`, projectJson);
}
