import {
    formatFiles,
    getProjects,
    ProjectConfiguration,
    Tree,
    updateProjectConfiguration,
} from '@nx/devkit';
import { hasNonExistProject } from '../../helpers/projects';
import { LinkGeneratorSchema } from './schema';

/**
 * Links the specified targets as dependencies of the given targets.
 *
 * This generator will throw errors if any of the specified targets or dependencies do not exist.
 * It will then add the specified dependencies to the targets implicitDependencies list.
 *
 * @param {Tree} tree - The file system tree representing the current project.
 * @param {LinkGeneratorSchema} options - The options passed to the generator, containing the targets and dependencies.
 * @returns {Promise<void>} A promise that resolves when the generator has completed its task.
 */
export async function linkGenerator(tree: Tree, options: LinkGeneratorSchema): Promise<void> {
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
        // This ensure we do not have circular dependencies
        const newImplicitDependencies = dependencies.filter(dep => dep != target);

        // We're 99% sure that target project exist so it's safe to cast type
        const current = projects.get(target) as ProjectConfiguration;

        const implicitDependencies = Array.from(
            new Set((current.implicitDependencies || []).concat(newImplicitDependencies))
        );

        updateProjectConfiguration(tree, target, {
            ...current,
            implicitDependencies: implicitDependencies.length ? implicitDependencies : undefined,
        });
    }

    await formatFiles(tree);
}

export default linkGenerator;
