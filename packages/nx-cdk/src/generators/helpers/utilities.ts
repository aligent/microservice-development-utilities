import { readJsonFile, readProjectConfiguration, Tree, workspaceRoot } from '@nx/devkit';
import { join } from 'path';
import { Project } from 'ts-morph';
import { PACKAGE_JSON } from './configs/packageJson';
import { TS_CONFIG_JSON, TS_CONFIG_LIB_JSON, TS_CONFIG_SPEC_JSON } from './configs/tsConfigs';

interface Service {
    name: string;
    constant: string;
    stack: string;
}

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
            name: `@${name}/integrations`,
            description: `${name} integrations mono-repository`,
            version,
            ...PACKAGE_JSON,
            devDependencies,
            engines: { node: `^${nodeVersionMajor}.${nodeVersionMinor}.0` },
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

export async function addServiceStackToMainApplication(
    tree: Tree,
    service: Service,
    projectName: string
) {
    const application = readProjectConfiguration(tree, projectName);
    const stacksPath = join(workspaceRoot, application.root, 'lib/service-stacks.ts');

    const project = new Project();
    const stackSource = project.addSourceFileAtPath(stacksPath);

    const applicationStage = stackSource.getClassOrThrow('ApplicationStage');
    const stageConstructors = applicationStage?.getConstructors();

    if (!stageConstructors?.length) {
        throw new Error('Unable to find main application stage constructor');
    }

    stackSource.addImportDeclaration({
        moduleSpecifier: `@services/${service.name}`,
        namedImports: [service.constant, service.stack],
    });

    stageConstructors[0]?.addStatements(
        `new ${service.stack}(this, ${service.constant}.NAME, { ...props, description: ${service.constant}.DESCRIPTION });`
    );

    await stackSource?.save();
}
