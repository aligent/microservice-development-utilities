import { createProjectGraphAsync, formatFiles, ProjectGraph, Tree, updateJson } from '@nx/devkit';
import { MAIN_APPLICATION_NAME, SERVICES_FOLDER, SERVICES_SCOPE } from '../constants';
import {
    assertValidServiceName,
    removeBundleDependency,
    removeServiceFromMainApplication,
    removeTsConfigReference,
} from '../helpers/utilities';
import { RemoveGeneratorSchema } from './schema';

/**
 * The main application always depends on a service the service generator
 * registered, and this generator removes those references itself, so only
 * other dependents block removal.
 */
function findBlockingDependents(graph: ProjectGraph, projectName: string) {
    return Object.entries(graph.dependencies)
        .filter(([source]) => source !== projectName && source !== MAIN_APPLICATION_NAME)
        .filter(([, deps]) => deps.some(d => d.target === projectName))
        .map(([source]) => source);
}

export async function removeGenerator(tree: Tree, options: RemoveGeneratorSchema) {
    const { name, forceRemove } = options;

    assertValidServiceName(name);

    const projectRoot = `${SERVICES_FOLDER}/${name}`;
    const projectName = `${SERVICES_SCOPE}/${name}`;

    if (!tree.exists(projectRoot)) {
        throw new Error(`Service "${name}" does not exist at "${projectRoot}".`);
    }

    if (!forceRemove) {
        const dependents = findBlockingDependents(await createProjectGraphAsync(), projectName);

        if (dependents.length > 0) {
            throw new Error(
                `Cannot remove "${name}": it is depended on by ${dependents.join(', ')}. ` +
                    'Use --forceRemove to skip this check.'
            );
        }
    }

    removeServiceFromMainApplication(tree, name, MAIN_APPLICATION_NAME);
    removeTsConfigReference(tree, `./${projectRoot}`);
    removeBundleDependency(tree, name, MAIN_APPLICATION_NAME);

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
