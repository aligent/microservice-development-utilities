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

const DEFAULT_NODE_VERSION = '24.0.1';

/**
 * Preset generator invoked by `create-nx-workspace --preset=@aligent/nx-appbuilder`.
 *
 * Scaffolds the workspace shell — root package.json, nx.json, .npmrc, etc. —
 * but does NOT scaffold any apps. Apps are added afterwards via the `app`
 * generator (`npx nx g @aligent/nx-appbuilder:app <name>`).
 *
 * Name shape (kebab-case) and nodeVersion semver are enforced by the schema's
 * `pattern` fields before this function runs.
 */
export default async function presetGenerator(tree: Tree, options: PresetGeneratorSchema) {
    const nodeVersion = options.nodeVersion ?? DEFAULT_NODE_VERSION;

    const subs = {
        ...options,
        nodeVersion,
        packageName: `@aligent/${options.name}`,
    } as unknown as Record<string, unknown>;

    generateFiles(tree, path.join(__dirname, 'files'), '.', subs);

    updateNxJson(tree, { ...NX_JSON });
    writeJson(tree, 'package.json', buildWorkspacePackageJson(options.name, nodeVersion));

    await formatFiles(tree);
}

/**
 * Build the workspace package.json. Includes `@aligent/nx-appbuilder` in
 * devDependencies so the lockfile written by create-nx-workspace stays in sync
 * with what the preset declares — otherwise npm fails the post-preset install
 * with an arborist "must provide string spec" error.
 */
function buildWorkspacePackageJson(name: string, nodeVersion: string) {
    const major = nodeVersion.split('.')[0];
    return {
        name: `@aligent/${name}`,
        version: '0.0.0',
        author: 'Aligent Consulting',
        private: true,
        engines: { node: `>=${major}` },
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
            // Resolved by the workspace's tsconfig.json's `extends` line and
            // by every generated app's tsconfig chain. Pinned at the workspace
            // root so all apps share one resolution.
            '@aligent/ts-code-standards': '^4.2.0',
            // The @nx plugin packages need to be installed at the workspace
            // root so the plugins declared in nx.json can actually load.
            '@nx/eslint': '^22.4.5',
            '@nx/js': '^22.4.5',
            '@nx/vitest': '^22.4.5',
            eslint: '^9.0.0',
            nx: '^22.4.5',
            typescript: '^5.8.3',
            vitest: '^2.1.8',
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
