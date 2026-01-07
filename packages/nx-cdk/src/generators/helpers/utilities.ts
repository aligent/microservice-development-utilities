/* v8 ignore start */
import { readJsonFile, readProjectConfiguration, Tree } from '@nx/devkit';
import { existsSync } from 'fs';
import { join } from 'path';
import { Project } from 'ts-morph';
import { PACKAGE_JSON } from './configs/packageJson';
import { TS_CONFIG_JSON, TS_CONFIG_LIB_JSON, TS_CONFIG_SPEC_JSON } from './configs/tsConfigs';

interface PackageJsonInput {
    name: string;
    projectName: string;
    version: string;
    nodeVersion: string;
}

interface Service {
    name: string;
    constant: string;
    stack: string;
}

export function constructPackageJsonFile(input: PackageJsonInput) {
    const devDependencies = Object.fromEntries(
        Object.entries({
            '@aligent/nx-cdk': input.version,
            ...PACKAGE_JSON.devDependencies,
        }).sort()
    );

    const packageJson = Object.fromEntries(
        Object.entries({
            name: `@${input.name}/integrations`,
            description: `${input.projectName} integrations mono-repository`,
            version: input.version,
            ...PACKAGE_JSON,
            devDependencies,
            engines: { node: `^${input.nodeVersion}` },
        })
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
        typeof obj.version === 'string'
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

/**
 * Automatically registers a service stack to the main CDK application's ApplicationStage.
 *
 * This function modifies the service-stacks.ts file by:
 * 1. Adding import statements for the service's stack class and constants
 * 2. Instantiating the stack within the ApplicationStage constructor
 *
 * @param tree - The Nx virtual file system tree
 * @param service - Service information containing name, constant, and stack class names
 * @param projectName - The name of the main application project to register the service to
 *
 * @throws {Error} If the ApplicationStage constructor cannot be found in service-stacks.ts
 */
export async function addServiceStackToMainApplication(
    tree: Tree,
    service: Service,
    projectName: string
) {
    const application = readProjectConfiguration(tree, projectName);

    if (application.root.includes('..')) {
        throw new Error('Invalid application root path');
    }

    const stacksPath = join(tree.root, application.root, 'lib/service-stacks.ts');

    if (!existsSync(stacksPath)) {
        console.log('Service Stacks does not exist, skipping service stacks registration.');
        return;
    }

    const project = new Project();
    const stackSource = project.addSourceFileAtPath(stacksPath);

    const applicationStage = stackSource.getClassOrThrow('ApplicationStage');
    const stageConstructor = applicationStage.getConstructors()[0];

    if (!stageConstructor) {
        throw new Error('Unable to find main application stage constructor');
    }

    stackSource.addImportDeclaration({
        moduleSpecifier: `@services/${service.name}`,
        namedImports: [service.constant, service.stack],
    });

    const sharedInfra = stageConstructor.getVariableStatement('sharedInfra');
    const sharedPropsStatement = sharedInfra ? `...sharedInfra.getProps(),` : '';

    stageConstructor.addStatements(
        `new ${service.stack}(this, ${service.constant}.NAME, { ...props, ${sharedPropsStatement} description: ${service.constant}.DESCRIPTION });`
    );

    await stackSource.save();
}

/**
 * Splits a kebab-case name into an array of capitalized parts.
 *
 * @param name - The kebab-case string to split (e.g., "my-service-name")
 * @returns An array of strings with each part capitalized (e.g., ["My", "Service", "Name"])
 */
export function splitInputName(name: string) {
    return name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1));
}
