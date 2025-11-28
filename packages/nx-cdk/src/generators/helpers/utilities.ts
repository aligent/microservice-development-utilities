import { readJsonFile } from '@nx/devkit';
import { join } from 'path';
import { PACKAGE_JSON } from './configs/packageJson';
import { TS_CONFIG_JSON, TS_CONFIG_LIB_JSON, TS_CONFIG_SPEC_JSON } from './configs/tsConfigs';

export function constructPackageJsonFile(name: string, version: string, nodeVersion: string) {
    const [nodeVersionMajor, nodeVersionMinor] = nodeVersion.split('.');

    const devDependencies = Object.fromEntries(
        Object.entries({
            '@aligent/nx-cdk': version,
            ...PACKAGE_JSON.devDependencies,
        }).sort()
    );

    const packageJson = Object.fromEntries(
        Object.entries({
            ...PACKAGE_JSON,
            name: `@${name}/integrations`,
            description: `${name} integrations mono-repository`,
            version,
            devDependencies,
            engines: { node: `^${nodeVersionMajor}.${nodeVersionMinor}.0` },
        }).sort()
    );

    return packageJson;
}

export function constructProjectTsConfigFiles(type: 'application' | 'service') {
    const tsConfig = { ...TS_CONFIG_JSON };
    if (type === 'service') {
        tsConfig.references = [{ path: './tsconfig.lib.json' }, { path: './tsconfig.spec.json' }];
    }

    return {
        tsConfig,
        tsConfigLib: { ...TS_CONFIG_LIB_JSON },
        tsConfigSpec: { ...TS_CONFIG_SPEC_JSON },
    };
}

function isPackageJsonWithVersion(obj: unknown): obj is { version: string } {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'version' in obj &&
        typeof (obj as any).version === 'string'
    );
}

export function getGeneratorVersion() {
    const packagePath = join(__dirname, '../../../package.json');
    const packageJson = readJsonFile(packagePath);

    if (isPackageJsonWithVersion(packageJson)) {
        return packageJson.version;
    }

    throw new Error(`Unable to get generator version from ${packagePath}`);
}
