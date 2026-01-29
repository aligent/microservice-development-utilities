import { logger } from '@nx/devkit';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Extracts package name and version from a preset string
 */
export function parsePreset(preset: string) {
    const defaultVersion = 'latest';
    // Handle scoped packages: @scope/package@version or @scope/package
    const scoped = preset.match(/^(@[^/]+\/[^@]+)(?:@(.+))?$/);
    if (scoped) {
        return { presetName: scoped[1], version: scoped[2] || defaultVersion };
    }

    // Handle regular packages: package@version or package
    const regular = preset.match(/^([^@]+)(?:@(.+))?$/);
    if (regular) {
        return {
            presetName: regular[1],
            version: regular[2] || defaultVersion,
        };
    }

    return { presetName: preset };
}

export function isCommandAvailable(command: string): boolean {
    try {
        execSync(`${command} --version`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

export function showCorepackInstructions(): void {
    logger.info('\n');
    logger.info('This tool requires Yarn via Corepack.\n');
    logger.info('To enable corepack, run: corepack enable');
    logger.info('\n');
    logger.info('If corepack is not installed, you need Node.js 16.9+ or higher.');
    logger.info('Corepack is included with Node.js but may need to be enabled.\n');
    logger.info('For more information, visit:');
    logger.info('   https://nodejs.org/api/corepack.html\n');
}

/**
 * Handle graceful exit on user cancellation
 */
export function handleCancellation(): never {
    logger.warn('\nWorkspace creation cancelled\n');
    process.exit(0);
}

export function logErrorThenExit(error: unknown, suggestion?: string): never {
    logger.info('\n');
    logger.error(error);
    if (suggestion) logger.info(suggestion);
    logger.info('\n');

    process.exit(1);
}

export function cleanupWorkspace(directory: string, items: string[]): void {
    for (const item of items) {
        const itemPath = path.join(directory, item);
        if (fs.existsSync(itemPath)) {
            try {
                fs.rmSync(itemPath, { recursive: true, force: true });
            } catch {
                logger.warn(`Failed to remove ${item}`);
            }
        }
    }
}

export async function failedWorkspaceCleanup(directory: string, debug: boolean): Promise<void> {
    if (!debug && fs.existsSync(directory)) {
        try {
            fs.rmSync(directory, { recursive: true, force: true });
            logger.info('Cleaned up incomplete workspace');
        } catch {
            logger.warn('Failed to clean up directory. You may need to remove it manually.');
        }
    }
}
