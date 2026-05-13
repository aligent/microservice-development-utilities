import { formatFiles, generateFiles, Tree, updateNxJson, writeJson } from '@nx/devkit';
import { join } from 'path';
import { MAIN_APPLICATION_FOLDER, MAIN_APPLICATION_NAME } from '../constants';
import { NX_JSON } from '../helpers/configs/nxJson';
import {
    constructPackageJsonFile,
    constructProjectTsConfigFiles,
    getGeneratorVersion,
    splitInputName,
} from '../helpers/utilities';
import { PresetGeneratorSchema } from './schema';

export async function presetGenerator(tree: Tree, options: PresetGeneratorSchema) {
    const { name, destination, nodeVersion } = options;
    const [nodeVersionMajor] = nodeVersion.split('.');
    const nameParts = splitInputName(name);
    const projectName = nameParts.join(' ');

    const templateVars = {
        ...options,
        projectName,
        folderName: destination || name,
        nodeRuntime: `${nodeVersionMajor}_X`,
        template: '',
    };

    generateFiles(tree, join(__dirname, 'files'), '.', templateVars);

    if (options.example) {
        generateFiles(tree, join(__dirname, 'files-example'), '.', templateVars);
    }

    updateNxJson(tree, { ...NX_JSON });

    const packageJson = constructPackageJsonFile({
        name: options.name,
        projectName,
        version: getGeneratorVersion(),
        nodeVersion,
    });
    writeJson(tree, 'package.json', packageJson);

    // Generate application's tsconfigs
    const { tsConfig } = constructProjectTsConfigFiles(MAIN_APPLICATION_NAME);
    writeJson(tree, `${MAIN_APPLICATION_FOLDER}/tsconfig.json`, tsConfig);

    await formatFiles(tree);
}

export default presetGenerator;
