import { formatFiles, generateFiles, Tree, updateNxJson, writeJson } from '@nx/devkit';
import { join } from 'path';
import { NX_JSON } from '../helpers/configs/nxJson';
import {
    constructPackageJsonFile,
    constructProjectTsConfigFiles,
    getGeneratorVersion,
} from '../helpers/utilities';
import { PresetGeneratorSchema } from './schema';

export async function presetGenerator(tree: Tree, options: PresetGeneratorSchema) {
    const { name, nodeVersion } = options;
    const version = getGeneratorVersion();

    generateFiles(tree, join(__dirname, 'files'), '.', {
        ...options,
        template: '',
    });

    updateNxJson(tree, { ...NX_JSON });

    const packageJson = constructPackageJsonFile(name, version, nodeVersion);
    writeJson(tree, 'package.json', packageJson);

    // Generate application's tsconfigs
    const { tsConfig, tsConfigLib, tsConfigSpec } = constructProjectTsConfigFiles('application');
    writeJson(tree, 'application/tsconfig.json', tsConfig);
    writeJson(tree, 'application/tsconfig.lib.json', tsConfigLib);
    writeJson(tree, 'application/tsconfig.spec.json', tsConfigSpec);

    await formatFiles(tree);
}

export default presetGenerator;
