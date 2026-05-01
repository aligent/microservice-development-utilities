import type { Tree } from '@nx/devkit';
import type { NormalizedSchema } from '../schema';

/**
 * Adds the new app to the root package.json's workspaces array.
 */
export function updateRootPackageJson(tree: Tree, options: NormalizedSchema): void {
    const rootPath = 'package.json';
    if (!tree.exists(rootPath)) {
        throw new Error('No root package.json found — is this an Nx workspace?');
    }

    const raw = tree.read(rootPath, 'utf-8');
    if (raw === null) {
        throw new Error('Failed to read root package.json');
    }
    const json = JSON.parse(raw) as { workspaces?: string[] };
    const workspaces = Array.isArray(json.workspaces) ? json.workspaces : [];

    if (workspaces.includes(options.name)) return;

    workspaces.push(options.name);
    json.workspaces = workspaces;
    tree.write(rootPath, JSON.stringify(json, null, 4) + '\n');
}
