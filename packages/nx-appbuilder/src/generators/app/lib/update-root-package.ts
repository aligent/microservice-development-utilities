import type { Tree } from '@nx/devkit';
import { PARCEL_ROOT_CONFIG } from '../../helpers/parcel-root-config';
import type { NormalizedSchema } from '../schema';

interface RootPackageJson {
    workspaces?: string[];
    '@parcel/resolver-default'?: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Adds the new app to the root package.json's workspaces array and, for admin
 * UI apps, makes sure Parcel's `packageExports` is enabled at the root.
 *
 * Parcel reads plugin config from the project root (the nearest lockfile), so
 * the `@parcel/resolver-default` block the app's own package.json carries is
 * ignored inside a workspace — and without it the web build cannot resolve
 * `#app.commerce.config`. The preset writes this for new workspaces; merging it
 * here covers workspaces created before it did.
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
    const json = JSON.parse(raw) as RootPackageJson;
    const workspaces = Array.isArray(json.workspaces) ? json.workspaces : [];

    let changed = false;

    if (!workspaces.includes(options.name)) {
        workspaces.push(options.name);
        json.workspaces = workspaces;
        changed = true;
    }

    if (options.hasAdminUI) {
        const resolver = json['@parcel/resolver-default'] ?? {};
        if (resolver['packageExports'] !== true) {
            json['@parcel/resolver-default'] = {
                ...resolver,
                ...PARCEL_ROOT_CONFIG['@parcel/resolver-default'],
            };
            changed = true;
        }
    }

    if (!changed) return;

    tree.write(rootPath, JSON.stringify(json, null, 4) + '\n');
}
