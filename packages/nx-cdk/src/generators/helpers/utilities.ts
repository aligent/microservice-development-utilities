/* v8 ignore start */
import {
    joinPathFragments,
    logger,
    readJsonFile,
    readProjectConfiguration,
    Tree,
    updateJson,
} from '@nx/devkit';
import { join } from 'path';
import { InMemoryFileSystemHost, Project, type SourceFile } from 'ts-morph';
import { ProjectType, SERVICES_SCOPE } from '../constants';
import {
    BASE_COMPILER_OPTIONS,
    TS_CONFIG_JSON,
    TS_CONFIG_LIB_JSON,
    TS_CONFIG_SPEC_JSON,
} from './configs/tsConfigs';

interface PackageJsonInput {
    name: string;
    projectName: string;
    version: string;
    nodeVersion: { major: string; full: string };
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
            '@types/node': `^${input.nodeVersion.major}`,
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
            engines: { node: `^${input.nodeVersion.full}` },
            nx: { name: `${input.name}-int`, ...config.nx },
        })
    );

    return packageJson;
}

export function constructProjectTsConfigFiles(type: ProjectType) {
    const tsConfig = { ...TS_CONFIG_JSON, compilerOptions: { ...TS_CONFIG_JSON.compilerOptions } };

    if (type === 'application') {
        tsConfig.compilerOptions = { ...BASE_COMPILER_OPTIONS };
        tsConfig.include = ['bin/**/*.ts', 'lib/**/*.ts'];
    }

    if (type === 'service') {
        tsConfig.references = [
            { path: '../../libs/infra' },
            { path: './tsconfig.lib.json' },
            { path: './tsconfig.spec.json' },
        ];
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
 * Logs a warning and skips registration when service-stacks.ts does not exist.
 *
 * @throws {Error} If the ApplicationStage class or its constructor cannot be found in service-stacks.ts
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

    const stacksRelativePath = joinPathFragments(application.root, 'lib/service-stacks.ts');

    if (!tree.exists(stacksRelativePath)) {
        logger.warn(
            `${stacksRelativePath} does not exist, skipping service stacks registration. Register the stack manually.`
        );
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

    const applicationStage = stackSource.getClass('ApplicationStage');

    if (!applicationStage) {
        throw new Error(`Unable to find ApplicationStage in ${stacksRelativePath}`);
    }

    const stageConstructor = applicationStage.getConstructors()[0];

    if (!stageConstructor) {
        throw new Error(`Unable to find ApplicationStage constructor in ${stacksRelativePath}`);
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
 * This is best-effort cleanup: it logs a warning and skips when service-stacks.ts or
 * ApplicationStage is missing, rather than throwing.
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

    const stacksRelativePath = joinPathFragments(application.root, 'lib/service-stacks.ts');

    if (!tree.exists(stacksRelativePath)) {
        logger.warn(
            `${stacksRelativePath} does not exist, skipping service stacks cleanup. Remove the stack registration manually.`
        );
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

    const stackClassName = `${splitInputName(serviceName).join('')}Stack`;
    removeStackInstantiation(stackSource, stackClassName, stacksRelativePath);

    tree.write(stacksRelativePath, stackSource.getFullText());
}

/**
 * Removes the statements in the ApplicationStage constructor that instantiate the given stack
 * class. Warns and leaves the file as it is when ApplicationStage is missing, because the caller
 * still has to save the import removal it has already made.
 */
function removeStackInstantiation(
    stackSource: SourceFile,
    stackClassName: string,
    stacksPath: string
) {
    const applicationStage = stackSource.getClass('ApplicationStage');

    if (!applicationStage) {
        logger.warn(
            `ApplicationStage not found in ${stacksPath}, remove the stack registration manually.`
        );
        return;
    }

    const stageConstructor = applicationStage.getConstructors()[0];

    if (!stageConstructor) {
        return;
    }

    for (const statement of stageConstructor.getStatements()) {
        if (statement.getText().includes(`new ${stackClassName}(`)) {
            statement.remove();
        }
    }
}

/**
 * Adds a service to the main application's bundleDependencies in package.json.
 *
 * @param tree - The Nx virtual file system tree
 * @param serviceName - The name of the service (e.g., "companies")
 * @param projectName - The name of the main application project
 */
export function addBundleDependency(tree: Tree, serviceName: string, projectName: string) {
    const application = readProjectConfiguration(tree, projectName);
    const packageJsonPath = joinPathFragments(application.root, 'package.json');

    if (!tree.exists(packageJsonPath)) {
        return;
    }

    updateJson(tree, packageJsonPath, json => {
        json.bundleDependencies ??= [];

        const dependency = `${SERVICES_SCOPE}/${serviceName}`;
        if (!json.bundleDependencies.includes(dependency)) {
            json.bundleDependencies.push(dependency);
        }

        return json;
    });
}

/**
 * Removes a service from the main application's bundleDependencies in package.json.
 *
 * @param tree - The Nx virtual file system tree
 * @param serviceName - The name of the service (e.g., "companies")
 * @param projectName - The name of the main application project
 */
export function removeBundleDependency(tree: Tree, serviceName: string, projectName: string) {
    const application = readProjectConfiguration(tree, projectName);
    const packageJsonPath = joinPathFragments(application.root, 'package.json');

    if (!tree.exists(packageJsonPath)) {
        return;
    }

    updateJson(tree, packageJsonPath, json => {
        if (Array.isArray(json.bundleDependencies)) {
            json.bundleDependencies = json.bundleDependencies.filter(
                (dep: string) => dep !== `${SERVICES_SCOPE}/${serviceName}`
            );
        }
        return json;
    });
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

/**
 * Kebab-case starting with a letter, so the derived stack class name and
 * constant are valid TypeScript identifiers. The generators' schema.json
 * files repeat the name patterns (JSON cannot import them); a spec keeps them in sync.
 */
export const SERVICE_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Path-safety only, for operating on services that already exist: they may
 * predate the stricter {@link SERVICE_NAME_PATTERN} and must stay removable.
 */
export const SAFE_SERVICE_PATH_PATTERN = /^[a-z0-9-]+$/;

/**
 * Validates a name for a service about to be generated. It must be both
 * path-safe and usable as the basis of the generated TypeScript identifiers.
 *
 * @throws {Error} If the name is not kebab-case made of lowercase
 * alphanumeric characters, starting with a letter.
 */
export function assertValidServiceName(name: string): void {
    if (!SERVICE_NAME_PATTERN.test(name)) {
        throw new Error(
            `Invalid service name "${name}". Service names must be lowercase kebab-case, start with a letter and contain only alphanumeric characters and single dashes.`
        );
    }
}

/**
 * Validates that a service name is safe to use when building filesystem
 * paths. `Tree` does not sandbox `..` segments, so an unvalidated name
 * (e.g. "../../etc") can escape the services directory during deletion.
 * Unlike {@link assertValidServiceName} it does not require a valid
 * identifier, so existing services with legacy names can still be removed.
 *
 * @throws {Error} If the name contains anything other than lowercase
 * alphanumeric characters and dashes.
 */
export function assertSafeServicePath(name: string): void {
    if (!SAFE_SERVICE_PATH_PATTERN.test(name)) {
        throw new Error(
            `Invalid service name "${name}". Service names must contain only lowercase alphanumeric characters and dashes.`
        );
    }
}
