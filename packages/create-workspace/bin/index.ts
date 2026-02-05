#!/usr/bin/env node
import { logger } from '@nx/devkit';
import { createWorkspace } from 'create-nx-workspace';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import yargs from 'yargs';
import {
    cleanupWorkspace,
    failedWorkspaceCleanup,
    handleCancellation,
    isCommandAvailable,
    logErrorThenExit,
    parsePreset,
    showCorepackInstructions,
} from './lib/helpers';

const PACKAGE_MANAGER = 'npm';
const ITEMS_TO_REMOVE = ['package-lock.json', '.nx', '.vscode', 'node_modules'];

async function main() {
    // Handle Ctrl+C gracefully
    process.on('SIGINT', handleCancellation);

    const corepackAvailable = isCommandAvailable('corepack');

    if (!corepackAvailable) {
        showCorepackInstructions();
        logErrorThenExit('Corepack is not available on your system');
    }

    const commandIndex = process.argv.findIndex(text => text.includes('create-workspace'));
    const args = await yargs(process.argv.slice(commandIndex + 1))
        .options({
            preset: {
                type: 'string',
                demandOption: false,
                description: 'The preset to use (e.g., @aligent/nx-cdk)',
            },
            name: {
                type: 'string',
                demandOption: false,
                description: 'The workspace name',
            },
            debug: {
                type: 'boolean',
                demandOption: false,
                default: false,
            },
        })
        .usage('Usage: $0 --preset [preset] --name [name]')
        .example('$0 --preset @aligent/nx-cdk --name my-app', '')
        .showHelpOnFail(false, 'Specify --help for available options')
        .version()
        .parse();

    const responses = await prompts(
        [
            {
                type: args.preset ? null : 'text',
                name: 'preset',
                message: 'Which preset would you like to use?',
                initial: '@aligent/nx-cdk',
                validate: (value: string) =>
                    value.length > 0 || 'Preset is required (e.g., @aligent/nx-cdk)',
            },
            {
                type: args.name ? null : 'text',
                name: 'name',
                message: 'What is your workspace name?',
                validate: (value: string) => {
                    if (value.length === 0) return 'Workspace name is required';
                    if (!/^[a-z0-9-]+$/.test(value))
                        return 'Workspace name must contain only lowercase letters, numbers, and hyphens';
                    return true;
                },
            },
        ],
        { onCancel: handleCancellation }
    );

    const preset = args.preset || responses.preset;
    const name = args.name || responses.name;

    if (!preset || !name) {
        logErrorThenExit('Missing required information');
    }

    const targetDir = path.join(process.cwd(), name);
    if (fs.existsSync(targetDir)) {
        logErrorThenExit(
            `Directory "${name}" already exists in the current location`,
            'Please choose a different name or remove the existing directory.'
        );
    }

    const { presetName, version } = parsePreset(preset);
    if (!version) {
        logErrorThenExit('Malfunction required preset');
    }

    const presetWithVersion = `${presetName}@${version}`;

    logger.info('\n📋 Configuration:');
    logger.info(`   Workspace name:    ${name}`);
    logger.info(`   Preset:            ${presetWithVersion}`);
    logger.info(`   Target directory:  ${targetDir}`);
    logger.info('');

    const { confirmed } = await prompts(
        {
            type: 'confirm',
            name: 'confirmed',
            message: 'Create workspace with these settings?',
            initial: true,
        },
        { onCancel: handleCancellation }
    );

    if (!confirmed) {
        handleCancellation();
    }

    try {
        const { directory } = await createWorkspace(presetWithVersion, {
            name,
            nxCloud: 'skip',
            packageManager: PACKAGE_MANAGER,
        });

        cleanupWorkspace(directory, ITEMS_TO_REMOVE);

        // Show summary and next steps
        logger.info('\n✨ Summary:');
        logger.info(`   Successfully created workspace "${name}"`);
        logger.info(`   Using preset: ${presetWithVersion}`);
        logger.info(`   Location: ${directory}`);
        logger.info('');
        logger.info('📝 Next steps:');
        logger.info(`   1. cd ${name}`);
        logger.info('      Navigate to your new workspace directory');
        logger.info('');
        logger.info('   2. nvm use');
        logger.info('      Activate the Node.js version specified in .nvmrc');
        logger.info('');
        logger.info('   3. yarn install');
        logger.info('      Install all workspace dependencies');
        logger.info('');
    } catch (err) {
        logger.error('Failed to create workspace');

        const dirPath = path.join(process.cwd(), name);
        await failedWorkspaceCleanup(dirPath, args.debug);

        logger.error('Error details:');
        logErrorThenExit(err);
    }
}

main();
