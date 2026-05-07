import { createProjectGraphAsync, formatFiles, Tree, updateJson } from '@nx/devkit';
import { MAIN_APPLICATION_NAME, SERVICES_FOLDER, SERVICES_SCOPE } from '../constants';
import { removeServiceFromMainApplication, removeTsConfigReference } from '../helpers/utilities';
import { RemoveGeneratorSchema } from './schema';

export async function removeGenerator(tree: Tree, options: RemoveGeneratorSchema) {
    const { name, forceRemove } = options;

    const projectRoot = `${SERVICES_FOLDER}/${name}`;
    const projectName = `${SERVICES_SCOPE}/${name}`;

    if (!tree.exists(projectRoot)) {
        throw new Error(`Service "${name}" does not exist at "${projectRoot}".`);
    }

    if (!forceRemove) {
        const graph = await createProjectGraphAsync();
        const dependents = Object.entries(graph.dependencies)
            .filter(([source]) => source !== projectName)
            .filter(([, deps]) => deps.some(d => d.target === projectName))
            .map(([source]) => source);

        if (dependents.length > 0) {
            throw new Error(
                `Cannot remove "${name}": it is depended on by ${dependents.join(', ')}. ` +
                    'Use --forceRemove to skip this check.'
            );
        }
    }

    removeServiceFromMainApplication(tree, name, MAIN_APPLICATION_NAME);
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
