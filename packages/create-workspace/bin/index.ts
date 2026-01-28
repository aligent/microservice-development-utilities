#!/usr/bin/env node
import { logger } from '@nx/devkit';
import { createWorkspace } from 'create-nx-workspace';
import fs from 'fs';
// ora v9+ is ESM-only. We use type-only import with 'resolution-mode': 'import' to get types,
// and dynamic import() at runtime to load the ESM module in our CommonJS context
import type { Ora } from 'ora' with { 'resolution-mode': 'import' };
import path from 'path';
import prompts from 'prompts';
import yargs from 'yargs';
import {
    checkCorepack,
    handleCancellation,
    logErrorThenExit,
    parsePreset,
    showCorepackInstructions,
} from './lib/helpers';

const PACKAGE_MANAGER = 'yarn';

async function main() {
    // Handle Ctrl+C gracefully
    process.on('SIGINT', handleCancellation);

    // Check for corepack/yarn availability since we use yarn
    const { available: corepackAvailable, yarnAvailable } = checkCorepack();

    if (!corepackAvailable || !yarnAvailable) {
        showCorepackInstructions();

        if (!corepackAvailable) {
            logErrorThenExit('Corepack is not available on your system');
        }

        if (!yarnAvailable) {
            logErrorThenExit('Corepack is installed but not enabled');
        }
    }

    const commandIndex = process.argv.findIndex(text => text.includes('create-workspace'));
    const args = await yargs(process.argv.slice(commandIndex + 1))
        .options({
            preset: {
                type: 'string',
                demandOption: true,
                description: 'The preset to use (e.g., @aligent/nx-cdk)',
            },
            name: {
                type: 'string',
                demandOption: false,
                description: 'The workspace name',
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
        {
            onCancel: handleCancellation,
        }
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
        {
            onCancel: handleCancellation,
        }
    );

    if (!confirmed) {
        handleCancellation();
    }

    // Dynamic import of ESM ora module (works in async context even with CommonJS)
    const { default: ora } = await import('ora');
    const spinner: Ora = ora('Creating workspace...').start();

    try {
        const { directory } = await createWorkspace(presetWithVersion, {
            name,
            nxCloud: 'skip',
            packageManager: PACKAGE_MANAGER,
        });

        // TODO: add install packages if needed

        spinner.succeed(`Workspace ${name} created at: ${directory}`);
    } catch (err) {
        spinner.fail('Failed to create workspace');

        // Clean up failed attempt
        const dirPath = path.join(process.cwd(), name);
        if (fs.existsSync(dirPath)) {
            try {
                fs.rmSync(dirPath, { recursive: true, force: true });
                logger.info('Cleaned up incomplete workspace');
            } catch (cleanupError) {
                logger.warn('Failed to clean up directory. You may need to remove it manually.');
            }
        }

        logger.error('Error details:');
        logErrorThenExit(err);
    }
}

main();
