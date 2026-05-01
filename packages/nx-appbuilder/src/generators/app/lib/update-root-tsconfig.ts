import type { Tree } from '@nx/devkit';
import type { NormalizedSchema } from '../schema';

interface ProjectReference {
    path: string;
}

/**
 * Adds the new app to the workspace tsconfig.json's references array. Skips
 * silently when the workspace tsconfig.json is absent so existing workspaces
 * scaffolded before this template was added aren't forced to migrate.
 */
export function addTsConfigReference(tree: Tree, options: NormalizedSchema): void {
    const rootPath = 'tsconfig.json';
    if (!tree.exists(rootPath)) return;

    const raw = tree.read(rootPath, 'utf-8');
    if (raw === null) return;

    const json = JSON.parse(raw) as { references?: ProjectReference[] };
    const references = Array.isArray(json.references) ? json.references : [];
    const refPath = `./${options.name}`;

    if (references.some(ref => ref.path === refPath)) return;

    references.push({ path: refPath });
    json.references = references;
    tree.write(rootPath, JSON.stringify(json, null, 4) + '\n');
}
