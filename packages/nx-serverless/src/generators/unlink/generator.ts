import {
    ProjectConfiguration,
    Tree,
    formatFiles,
    getProjects,
    updateProjectConfiguration,
} from '@nx/devkit';
import { hasNonExistProject } from '../../helpers/projects';
import { UnlinkGeneratorSchema } from './schema';

/**
 * Unlinks the specified dependencies from the given targets.
 *
 * This generator will throw errors if any of the specified targets or dependencies do not exist.
 * It will then remove the specified dependencies from the specified targets.
 *
 * @param {Tree} tree - The file system tree representing the current project.
 * @param {UnlinkGeneratorSchema} options - The options passed to the generator, containing the targets and dependencies.
 * @returns {Promise<void>} A promise that resolves when the generator has completed its task.
 */
export async function unlinkGenerator(tree: Tree, options: UnlinkGeneratorSchema) {
    const targets = options.targets.split(',').map(target => target.trim());
    const dependencies = options.dependencies.split(',').map(dep => dep.trim());
    const projects = getProjects(tree);

    const nonExistTargets = hasNonExistProject(projects, targets);
    const nonExistDependencies = hasNonExistProject(projects, dependencies);

    if (nonExistTargets.length || nonExistDependencies.length) {
        throw new Error(
            `Projects ${nonExistTargets.concat(nonExistDependencies).join(', ')} do not exist`
        );
    }

    for (const target of targets) {
        // We're 99% sure that target project exist so it's safe to cast type
        const current = projects.get(target) as ProjectConfiguration;

        const currentImplicitDependencies = current.implicitDependencies || [];

        const implicitDependencies = currentImplicitDependencies.filter(
            dep => !dependencies.includes(dep)
        );

        updateProjectConfiguration(tree, target, {
            ...current,
            implicitDependencies: implicitDependencies.length ? implicitDependencies : undefined,
        });
    }

    await formatFiles(tree);
}

export default unlinkGenerator;
