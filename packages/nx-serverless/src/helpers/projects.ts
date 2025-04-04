import { ProjectConfiguration } from '@nx/devkit';

/**
 * Checks if any of the given project names do not exist in the provided map of projects.
 *
 * @param {Map<string, ProjectConfiguration>} projects - A map of project names to their configurations.
 * @param {string[]} names - An array of project names to check for existence.
 * @returns {string[]} An array of project names that do not exist in the provided map.
 */
export function hasNonExistProject(
    projects: Map<string, ProjectConfiguration>,
    names: string[]
): string[] {
    const projectNames = new Set(projects.keys());
    return names.filter(name => !projectNames.has(name));
}
