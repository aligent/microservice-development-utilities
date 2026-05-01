import { formatFiles, Tree, updateJson } from '@nx/devkit';
import { MAIN_APPLICATION_NAME, SERVICES_FOLDER } from '../constants';
import { removeServiceFromMainApplication, removeTsConfigReference } from '../helpers/utilities';
import { RemoveGeneratorSchema } from './schema';

export async function removeGenerator(tree: Tree, options: RemoveGeneratorSchema) {
    const projectRoot = `${SERVICES_FOLDER}/${options.name}`;

    removeServiceFromMainApplication(tree, options.name, MAIN_APPLICATION_NAME);
    removeTsConfigReference(tree, `./${projectRoot}`);

    tree.delete(projectRoot);

    if (tree.exists('package.json')) {
        updateJson(tree, 'package.json', json => {
            if (Array.isArray(json.workspaces)) {
                json.workspaces = json.workspaces.filter((w: string) => w !== projectRoot);
            }
            return json;
        });
    }

    await formatFiles(tree);
}

export default removeGenerator;
