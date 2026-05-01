/* v8 ignore start */
import { readJsonFile, readProjectConfiguration, Tree, updateJson } from '@nx/devkit';
import { join } from 'path';
import { InMemoryFileSystemHost, Project } from 'ts-morph';
import { SERVICES_SCOPE } from '../constants';
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

interface PackageJsonConfig {
    author: string;
    private: boolean;
    license: string;
    type: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    nx: Record<string, unknown>;
    workspaces: string[];
    packageManager: string;
}

/**
 * Reads the base package.json configuration from a JSON file.
 *
 * The configuration is stored as a standalone JSON file rather than a TypeScript constant
 * so that Dependabot can automatically detect and upgrade the dependency versions within it.
 *
 * @returns The parsed package.json configuration.
 */
function readPackageJsonConfig() {
    const configPath = join(__dirname, './configs/base-package/package.json');
    return readJsonFile<PackageJsonConfig>(configPath);
}

export function constructPackageJsonFile(input: PackageJsonInput) {
    const config = readPackageJsonConfig();

    const devDependencies = Object.fromEntries(
        Object.entries({
            '@aligent/nx-cdk': input.version,
            ...config.devDependencies,
        }).sort()
    );

    const packageJson = Object.fromEntries(
        Object.entries({
            name: `@${input.name}/integrations`,
            description: `${input.projectName} integrations mono-repository`,
            version: input.version,
            ...config,
            devDependencies,
            engines: { node: `^${input.nodeVersion}` },
            nx: { name: `${input.name}-int`, ...config.nx },
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
export function addServiceStackToMainApplication(
    tree: Tree,
    service: Service,
    projectName: string
) {
    const application = readProjectConfiguration(tree, projectName);

    if (application.root.includes('..')) {
        throw new Error('Invalid application root path');
    }

    const stacksRelativePath = join(application.root, 'lib/service-stacks.ts');

    if (!tree.exists(stacksRelativePath)) {
        console.log('Service Stacks does not exist, skipping service stacks registration.');
        return;
    }

    const content = tree.read(stacksRelativePath, 'utf-8');

    if (content === null) {
        throw new Error(`Failed to read file: ${stacksRelativePath}`);
    }

    const fs = new InMemoryFileSystemHost();
    fs.writeFileSync(stacksRelativePath, content);

    const project = new Project({ fileSystem: fs });
    const stackSource = project.addSourceFileAtPath(stacksRelativePath);

    const applicationStage = stackSource.getClassOrThrow('ApplicationStage');
    const stageConstructor = applicationStage.getConstructors()[0];

    if (!stageConstructor) {
        throw new Error('Unable to find main application stage constructor');
    }

    stackSource.addImportDeclaration({
        moduleSpecifier: `${SERVICES_SCOPE}/${service.name}`,
        namedImports: [service.constant, service.stack],
    });

    const sharedInfra = stageConstructor.getVariableStatement('sharedInfra');
    const sharedPropsStatement = sharedInfra ? `...sharedInfra.getProps(),` : '';

    stageConstructor.addStatements(
        `new ${service.stack}(this, ${service.constant}.NAME, { ...props, ${sharedPropsStatement} description: ${service.constant}.DESCRIPTION });`
    );

    tree.write(stacksRelativePath, stackSource.getFullText());
}

/**
 * Removes a service stack registration from the main CDK application's ApplicationStage.
 *
 * This function modifies the service-stacks.ts file by:
 * 1. Removing import statements that reference the service's module specifier
 * 2. Removing statements in the ApplicationStage constructor that reference the service's stack class
 *
 * @param tree - The Nx virtual file system tree
 * @param serviceName - The name of the service (e.g., "companies")
 * @param projectName - The name of the main application project
 */
export function removeServiceFromMainApplication(
    tree: Tree,
    serviceName: string,
    projectName: string
) {
    const application = readProjectConfiguration(tree, projectName);

    if (application.root.includes('..')) {
        throw new Error('Invalid application root path');
    }

    const stacksRelativePath = join(application.root, 'lib/service-stacks.ts');

    if (!tree.exists(stacksRelativePath)) {
        console.log('Service Stacks does not exist, skipping service stacks cleanup.');
        return;
    }

    const content = tree.read(stacksRelativePath, 'utf-8');

    if (content === null) {
        throw new Error(`Failed to read file: ${stacksRelativePath}`);
    }

    const fs = new InMemoryFileSystemHost();
    fs.writeFileSync(stacksRelativePath, content);

    const project = new Project({ fileSystem: fs });
    const stackSource = project.addSourceFileAtPath(stacksRelativePath);

    const imports = stackSource.getImportDeclarations();
    for (const importDecl of imports) {
        if (importDecl.getModuleSpecifierValue() === `${SERVICES_SCOPE}/${serviceName}`) {
            importDecl.remove();
        }
    }

    const nameParts = splitInputName(serviceName);
    const stackClassName = `${nameParts.join('')}Stack`;

    const applicationStage = stackSource.getClass('ApplicationStage');
    if (applicationStage) {
        const stageConstructor = applicationStage.getConstructors()[0];
        if (stageConstructor) {
            const statements = stageConstructor.getStatements();
            for (const statement of statements) {
                if (statement.getText().includes(`new ${stackClassName}(`)) {
                    statement.remove();
                }
            }
        }
    }

    tree.write(stacksRelativePath, stackSource.getFullText());
}

/**
 * Removes a project reference from the root tsconfig.json.
 *
 * @param tree - The Nx virtual file system tree
 * @param referencePath - The path to remove from the references array
 */
export function removeTsConfigReference(tree: Tree, referencePath: string) {
    updateJson(tree, 'tsconfig.json', json => {
        json.references = (json.references ?? []).filter(
            (r: { path: string }) => r.path !== referencePath
        );
        return json;
    });
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
