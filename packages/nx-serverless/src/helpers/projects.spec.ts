import { ProjectConfiguration } from '@nx/devkit';
import { hasNonExistProject } from './projects';

describe('hasNonExistProject', () => {
    let projects: Map<string, ProjectConfiguration>;

    beforeEach(() => {
        // Mock projects map
        projects = new Map<string, ProjectConfiguration>([
            ['projectA', {} as ProjectConfiguration],
            ['projectB', {} as ProjectConfiguration],
            ['projectC', {} as ProjectConfiguration],
        ]);
    });

    it('should return an empty array if all project names exist', () => {
        const names = ['projectA', 'projectB'];
        const result = hasNonExistProject(projects, names);
        expect(result).toEqual([]);
    });

    it('should return an array of project names that do not exist', () => {
        const names = ['projectA', 'projectD', 'projectE'];
        const result = hasNonExistProject(projects, names);
        expect(result).toEqual(['projectD', 'projectE']);
    });

    it('should return all names if none of them exist in the projects map', () => {
        const names = ['projectX', 'projectY', 'projectZ'];
        const result = hasNonExistProject(projects, names);
        expect(result).toEqual(['projectX', 'projectY', 'projectZ']);
    });

    it('should return an empty array if the names array is empty', () => {
        const names: string[] = [];
        const result = hasNonExistProject(projects, names);
        expect(result).toEqual([]);
    });

    it('should return all names if the projects map is empty', () => {
        projects = new Map(); // Empty projects map
        const names = ['projectA', 'projectB'];
        const result = hasNonExistProject(projects, names);
        expect(result).toEqual(['projectA', 'projectB']);
    });
});
