import { logger } from '@nx/devkit';
import { execSync } from 'child_process';

/**
 * Extracts package name and version from a preset string
 * @param preset - Format: "package@version" or "@scope/package@version" or "package"
 * @returns Object with packageName and version (or undefined if no version specified)
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

export function installDependencies(
    packageManager: string,
    args: string[],
    cwd: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            execSync(`${packageManager} ${args.join(' ')}`, {
                cwd,
                stdio: 'inherit',
            });
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Check if a command is available in the system
 */
function isCommandAvailable(command: string): boolean {
    try {
        execSync(`${command} --version`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if corepack is available and enabled
 */
export function checkCorepack(): { available: boolean; yarnAvailable: boolean } {
    const corepackAvailable = isCommandAvailable('corepack');

    if (!corepackAvailable) {
        return { available: false, yarnAvailable: false };
    }

    // Check if yarn is available (corepack might be installed but not enabled)
    const yarnAvailable = isCommandAvailable('yarn');

    return { available: corepackAvailable, yarnAvailable };
}

/**
 * Display corepack installation instructions
 */
export function showCorepackInstructions(): void {
    logger.info('\n');
    logger.info('This tool requires Yarn via Corepack.\n');
    logger.info('To enable corepack, run:\n');
    logger.info('   corepack enable yarn');
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
