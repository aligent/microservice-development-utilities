import { formatFiles, installPackagesTask, type Tree } from '@nx/devkit';
import { prompt } from 'enquirer';
import { applyFeatureFiles } from './lib/apply-feature-files';
import { writePackageJson } from './lib/compose-package-json';
import { normalizeOptions } from './lib/normalize-options';
import { updateRootPackageJson } from './lib/update-root-package';
import { addTsConfigReference } from './lib/update-root-tsconfig';
import type { AppGeneratorSchema, ParentMenu } from './schema';

export default async function appGenerator(tree: Tree, rawOptions: AppGeneratorSchema) {
    await promptForConditionalInputs(rawOptions);

    const options = normalizeOptions(tree, rawOptions);

    applyFeatureFiles(tree, options);
    writePackageJson(tree, options);
    updateRootPackageJson(tree, options);
    addTsConfigReference(tree, options);

    await formatFiles(tree);

    return () => {
        installPackagesTask(tree);
    };
}

/**
 * Prompts that depend on the value of other prompts can't be expressed in
 * Nx's schema.json, so they're driven from here. Currently only one: the
 * parent menu is asked iff hasAdminUI=true and the user didn't pass it.
 */
async function promptForConditionalInputs(opts: AppGeneratorSchema): Promise<void> {
    if (opts.hasAdminUI && opts.parentMenu === undefined) {
        const answer = await prompt<{ parentMenu: ParentMenu }>({
            type: 'select',
            name: 'parentMenu',
            message: 'Which Commerce admin menu does the menu item belong under?',
            choices: [
                'sales',
                'catalog',
                'customers',
                'marketing',
                'content',
                'reports',
                'stores',
                'system',
                'none',
            ],
        });
        opts.parentMenu = answer.parentMenu;
    }
}
