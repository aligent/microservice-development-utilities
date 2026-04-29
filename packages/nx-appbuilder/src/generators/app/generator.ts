import { formatFiles, installPackagesTask, type Tree } from '@nx/devkit';
import { prompt } from 'enquirer';
import { applyFeatureFiles } from './lib/apply-feature-files';
import { writePackageJson } from './lib/compose-package-json';
import { normalizeOptions } from './lib/normalize-options';
import { updateRootPackageJson } from './lib/update-root-package';
import type { AppGeneratorSchema, SidebarCategory } from './schema';

export default async function appGenerator(tree: Tree, rawOptions: AppGeneratorSchema) {
    await promptForConditionalInputs(rawOptions);

    const options = normalizeOptions(tree, rawOptions);

    applyFeatureFiles(tree, options);
    writePackageJson(tree, options);
    updateRootPackageJson(tree, options);

    await formatFiles(tree);

    return () => {
        installPackagesTask(tree);
    };
}

/**
 * Prompts that depend on the value of other prompts can't be expressed in
 * Nx's schema.json, so they're driven from here. Currently only one:
 * sidebar category is asked iff hasAdminUI=true and the user didn't pass it.
 */
async function promptForConditionalInputs(opts: AppGeneratorSchema): Promise<void> {
    if (opts.hasAdminUI && opts.sidebarCategory === undefined) {
        const answer = await prompt<{ sidebarCategory: SidebarCategory }>({
            type: 'select',
            name: 'sidebarCategory',
            message: 'Which sidebar category does the menu item belong under?',
            choices: ['catalog', 'sales', 'customers', 'content', 'none'],
        });
        opts.sidebarCategory = answer.sidebarCategory;
    }
}
