import { Tree, addProjectConfiguration, formatFiles, generateFiles } from '@nx/devkit';
import path from 'path';
import { serviceGeneratorSchema } from './schema';

const SERVICES_FOLDER = 'services';

const getTemplateFilesLocation = (type: serviceGeneratorSchema['type'] = 'general') => {
    if (type === 'notification') {
        return path.join(__dirname, 'notification-files');
    }

    return path.join(__dirname, 'general-files');
};

export async function serviceGenerator(tree: Tree, options: serviceGeneratorSchema) {
    const { name, type } = options;
    const projectRoot = `${SERVICES_FOLDER}/${name}`;

    if (!tree.exists(SERVICES_FOLDER)) {
        tree.write(`${SERVICES_FOLDER}/.gitkeep`, '');
    }

    addProjectConfiguration(tree, name, {
        root: projectRoot,
        projectType: 'application',
        sourceRoot: `${projectRoot}/src`,
        targets: {},
        tags: ['service', type, name],
    });

    const templateFilesLocation = getTemplateFilesLocation(type);

    generateFiles(tree, templateFilesLocation, projectRoot, options);

    await formatFiles(tree);
}

export default serviceGenerator;
