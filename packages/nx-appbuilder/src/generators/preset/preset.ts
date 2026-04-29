import {
    formatFiles,
    generateFiles,
    readJsonFile,
    updateNxJson,
    writeJson,
    type Tree,
} from '@nx/devkit';
import * as path from 'path';
import { NX_JSON } from './nx-json';
import type { PresetGeneratorSchema } from './schema';

const KEBAB = /^[a-z][a-z0-9-]*$/;

/**
 * Preset generator invoked by `create-nx-workspace --preset=@aligent/nx-appbuilder`.
 *
 * Scaffolds the workspace shell — root package.json, nx.json, .npmrc, etc. —
 * but does NOT scaffold any apps. Apps are added afterwards via the `app`
 * generator (`npx nx g @aligent/nx-appbuilder:app <name>`).
 */
export default async function presetGenerator(tree: Tree, options: PresetGeneratorSchema) {
    if (!KEBAB.test(options.name)) {
        throw new Error(
            `Workspace name "${options.name}" must be kebab-case (lowercase letters, digits, hyphens).`
        );
    }

    const subs = {
        ...options,
        packageName: `@aligent/${options.name}`,
    } as unknown as Record<string, unknown>;

    generateFiles(tree, path.join(__dirname, 'files'), '.', subs);

    updateNxJson(tree, { ...NX_JSON });
    writeJson(tree, 'package.json', buildWorkspacePackageJson(options.name));

    await formatFiles(tree);
}

/**
 * Build the workspace package.json. Includes `@aligent/nx-appbuilder` in
 * devDependencies so the lockfile written by create-nx-workspace stays in sync
 * with what the preset declares — otherwise npm fails the post-preset install
 * with an arborist "must provide string spec" error.
 */
function buildWorkspacePackageJson(name: string) {
    return {
        name: `@aligent/${name}`,
        version: '0.0.0',
        author: 'Aligent Consulting',
        private: true,
        scripts: {
            lint: 'nx affected -t lint',
            'lint:all': 'nx run-many -t lint',
            'check-types': 'nx affected -t check-types',
            'check-types:all': 'nx run-many -t check-types',
            test: 'nx affected -t test',
            'test:all': 'nx run-many -t test',
            build: 'nx affected -t build',
            'build:all': 'nx run-many -t build',
        },
        workspaces: [],
        devDependencies: {
            '@aligent/nx-appbuilder': getGeneratorVersion(),
            nx: '^22.4.5',
        },
    };
}

function getGeneratorVersion(): string {
    const packagePath = path.join(__dirname, '../../../package.json');
    const packageJson = readJsonFile<{ version?: string }>(packagePath);
    if (typeof packageJson.version !== 'string') {
        throw new Error(`Unable to read generator version from ${packagePath}`);
    }
    return packageJson.version;
}
