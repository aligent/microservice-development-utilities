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
    const subs = { ...options } as unknown as Record<string, unknown>;

    generateFiles(tree, path.join(filesRoot, 'base'), options.appRoot, subs);

    const usesCommerceLib =
        options.hasAdminUI || options.hasBusinessConfig || options.hasCommerceWebhooks;

    if (usesCommerceLib) {
        generateFiles(tree, path.join(filesRoot, 'commerce-extensibility'), options.appRoot, subs);
    }
    if (options.hasBusinessConfig) {
        generateFiles(tree, path.join(filesRoot, 'commerce-config'), options.appRoot, subs);
    }
    if (options.hasAdminUI) {
        generateFiles(tree, path.join(filesRoot, 'commerce-backend-ui'), options.appRoot, subs);
    }

    // Webhooks no longer have their own subtree — they're a section in
    // app.commerce.config.ts (rendered above as part of commerce-extensibility).
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
}
