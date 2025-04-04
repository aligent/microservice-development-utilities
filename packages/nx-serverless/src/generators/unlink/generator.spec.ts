import { Tree, readProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { unlinkGenerator } from './generator';
import { UnlinkGeneratorSchema } from './schema';

describe('unlinkGenerator', () => {
    let tree: Tree;
    const options: UnlinkGeneratorSchema = {
        targets: 'projectA',
        dependencies: 'projectB, projectC',
    };

    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();

        // Add mock projects to the workspace
        tree.write(
            'projectA/project.json',
            JSON.stringify({
                name: 'projectA',
                implicitDependencies: ['projectB', 'projectC', 'projectD'],
            })
        );
        tree.write('projectB/project.json', JSON.stringify({ name: 'projectB' }));
        tree.write('projectC/project.json', JSON.stringify({ name: 'projectC' }));
        tree.write('projectD/project.json', JSON.stringify({ name: 'projectD' }));
    });

    it('should remove dependencies from the target projects', async () => {
        await unlinkGenerator(tree, options);

        const projectAConfig = readProjectConfiguration(tree, 'projectA');
        expect(projectAConfig.implicitDependencies).toEqual(['projectD']);
    });

    it('should throw an error if target projects do not exist', async () => {
        const invalidOptions: UnlinkGeneratorSchema = {
            targets: 'nonExistentProject',
            dependencies: 'projectB',
        };

        await expect(unlinkGenerator(tree, invalidOptions)).rejects.toThrow(
            'Projects nonExistentProject do not exist'
        );
    });

    it('should throw an error if dependency projects do not exist', async () => {
        const invalidOptions: UnlinkGeneratorSchema = {
            targets: 'projectA',
            dependencies: 'nonExistentProject',
        };

        await expect(unlinkGenerator(tree, invalidOptions)).rejects.toThrow(
            'Projects nonExistentProject do not exist'
        );
    });

    it('should not throw an error if dependencies are not in the implicitDependencies list', async () => {
        tree.write('projectE/project.json', JSON.stringify({ name: 'projectE' }));
        const optionsWithNonExistentDependencies: UnlinkGeneratorSchema = {
            targets: 'projectA',
            dependencies: 'projectE',
        };

        await expect(
            unlinkGenerator(tree, optionsWithNonExistentDependencies)
        ).resolves.not.toThrow();

        const projectAConfig = readProjectConfiguration(tree, 'projectA');
        expect(projectAConfig.implicitDependencies).toEqual(['projectB', 'projectC', 'projectD']);
    });
});
