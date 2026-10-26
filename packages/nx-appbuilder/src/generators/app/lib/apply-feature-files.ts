import { generateFiles, type Tree } from '@nx/devkit';
import * as path from 'path';
import type { NormalizedSchema } from '../schema';

/**
 * Renders template files into the new app's directory based on selected flags.
 *
 * Each call to generateFiles overwrites earlier ones for the same file paths,
 * so subtree order matters when subtrees overlap (none currently do).
 */
export function applyFeatureFiles(tree: Tree, options: NormalizedSchema): void {
    const filesRoot = path.join(__dirname, '..', 'files');
    const subs: Record<string, unknown> = {
        ...options,
        nodeMajor: options.nodeVersion.split('.')[0],
    };

    generateFiles(tree, path.join(filesRoot, 'base'), options.appRoot, subs);

    if (options.usesCommerceLib) {
        generateFiles(tree, path.join(filesRoot, 'commerce-extensibility'), options.appRoot, subs);
    }
    if (options.hasBusinessConfig) {
        generateFiles(tree, path.join(filesRoot, 'commerce-config'), options.appRoot, subs);
    }
    if (options.hasAdminUI) {
        generateFiles(tree, path.join(filesRoot, 'commerce-backend-ui'), options.appRoot, subs);
    }

    // The webhook *bindings* live in app.commerce.config.ts (rendered above as
    // part of commerce-extensibility); this subtree only adds the sample action
    // they point at, since the lib rejects a `webhooks` list with no entries.
    if (options.hasCommerceWebhooks) {
        generateFiles(tree, path.join(filesRoot, 'commerce-webhooks'), options.appRoot, subs);
    }
    if (options.hasRestActions) {
        generateFiles(tree, path.join(filesRoot, 'rest-actions'), options.appRoot, subs);
    }
    if (options.hasEvents) {
        generateFiles(tree, path.join(filesRoot, 'events'), options.appRoot, subs);
    }
    if (options.hasScheduledActions) {
        generateFiles(tree, path.join(filesRoot, 'scheduled'), options.appRoot, subs);
    }
    if (options.hasCustomInstallSteps) {
        generateFiles(tree, path.join(filesRoot, 'install-steps'), options.appRoot, subs);
    }

    markHooksExecutable(tree, options.appRoot);
}

/**
 * `aio app build` runs the `pre-app-build` hooks in app.config.yaml as shell
 * commands (`./hooks/foo.sh`), so the scripts need the executable bit.
 * `generateFiles` writes content only — it never carries a template's mode —
 * so without this every fresh app fails its first build with "permission
 * denied" until someone runs `chmod +x hooks/*.sh`.
 */
function markHooksExecutable(tree: Tree, appRoot: string): void {
    const hooksDir = path.posix.join(appRoot, 'hooks');
    if (!tree.exists(hooksDir)) return;

    for (const entry of tree.children(hooksDir)) {
        if (entry.endsWith('.sh')) {
            tree.changePermissions(path.posix.join(hooksDir, entry), '755');
        }
    }
}
