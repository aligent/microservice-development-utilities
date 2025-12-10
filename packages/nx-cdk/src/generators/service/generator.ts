import { formatFiles, generateFiles, Tree, updateJson, writeJson } from '@nx/devkit';
import { join } from 'path';
import {
    addServiceStackToMainApplication,
    constructProjectTsConfigFiles,
    splitInputName,
} from '../helpers/utilities';
import { ServiceGeneratorSchema } from './schema';

const SERVICES_FOLDER = 'services';

function addTsConfigReference(tree: Tree, referencePath: string) {
    updateJson(tree, 'tsconfig.json', json => {
        json.references ??= [];

        if (json.references.some((r: { path: string }) => r.path === referencePath)) {
            throw new Error(
                `You already have a library using the import path "${referencePath}". Make sure to specify a unique one.`
            );
        }

        json.references.push({ path: referencePath });

        return json;
    });
}

export async function serviceGenerator(tree: Tree, options: ServiceGeneratorSchema) {
    const projectRoot = `${SERVICES_FOLDER}/${options.name}`;
    const nameParts = splitInputName(options.name);

    const constant = nameParts.map(name => name.toUpperCase()).join('_');
    const stack = `${nameParts.join('')}Stack`;

    if (!tree.exists(SERVICES_FOLDER)) {
        tree.write(`${SERVICES_FOLDER}/.gitkeep`, '');
    }

    generateFiles(tree, join(__dirname, 'files'), projectRoot, {
        ...options,
        serviceName: nameParts.join(' '),
        constant,
        stack,
        template: '',
    });

    // Generate service's tsconfigs
    const { tsConfig, tsConfigLib, tsConfigSpec } = constructProjectTsConfigFiles('service');
    writeJson(tree, `${projectRoot}/tsconfig.json`, tsConfig);
    writeJson(tree, `${projectRoot}/tsconfig.lib.json`, tsConfigLib);
    writeJson(tree, `${projectRoot}/tsconfig.spec.json`, tsConfigSpec);

    // Integrate the new service with the root application
    addTsConfigReference(tree, `./${projectRoot}`);
    addServiceStackToMainApplication(tree, { name: options.name, constant, stack }, 'application');

    await formatFiles(tree);
}

export default serviceGenerator;
