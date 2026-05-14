import {
    formatFiles,
    generateFiles,
    readJsonFile,
    updateNxJson,
    writeJson,
    type Tree,
} from '@nx/devkit';
import * as path from 'path';
import { loadTemplatePackage, pickVersions } from '../helpers/template-package';
import { NX_JSON } from './nx-json';
import type { PresetGeneratorSchema } from './schema';

const DEFAULT_NODE_VERSION = '24.0.1';

const TEMPLATE = loadTemplatePackage(__dirname);

const WORKSPACE_DEV_DEPS = pickVersions(TEMPLATE.devDependencies, [
    '@aligent/ts-code-standards',
    '@nx/eslint',
    '@nx/js',
    '@nx/vitest',
    'eslint',
    'nx',
    'prettier',
    'typescript',
    'vitest',
]);

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
 *
 * Most devDependency versions are sourced from `template-package/package.json`
 * (a real package.json that Dependabot watches). The self-version of
 * `@aligent/nx-appbuilder` is read from the generator's own package.json since
 * Dependabot can't track that.
 *
 * Notes on why each dep is pinned at the workspace root:
 * - `@aligent/ts-code-standards` is resolved by the workspace tsconfig's
 *   `extends` line and by every generated app's tsconfig chain.
 * - The `@nx/*` plugin packages need to be installed at the workspace root so
 *   the plugins declared in nx.json can load.
 * - `eslint` and `prettier` are also declared at the app level (so each app is
 *   self-sufficient), but pinning here ensures npm workspaces hoists a single
 *   shared version.
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
        devDependencies: sortObject({
            '@aligent/nx-appbuilder': getGeneratorVersion(),
            ...WORKSPACE_DEV_DEPS,
        }),
    };
}

function sortObject(obj: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

function getGeneratorVersion(): string {
    const packagePath = path.join(__dirname, '../../../package.json');
    const packageJson = readJsonFile<{ version?: string }>(packagePath);
    if (typeof packageJson.version !== 'string') {
        throw new Error(`Unable to read generator version from ${packagePath}`);
    }
    return packageJson.version;
}
