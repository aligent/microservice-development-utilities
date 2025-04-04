import { Tree, readProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { linkGenerator } from './generator';
import { LinkGeneratorSchema } from './schema';

describe('link generator', () => {
    let tree: Tree;
    const options: LinkGeneratorSchema = {
        targets: 'projectA',
        dependencies: 'projectB, projectC',
    };

    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();

        tree.write(
            'projectA/project.json',
            JSON.stringify({ name: 'projectA', implicitDependencies: [] })
        );
        tree.write('projectB/project.json', JSON.stringify({ name: 'projectB' }));
        tree.write('projectC/project.json', JSON.stringify({ name: 'projectC' }));
    });

    it('should add dependencies to the target projects', async () => {
        await linkGenerator(tree, options);

        const projectAConfig = readProjectConfiguration(tree, 'projectA');
        expect(projectAConfig.implicitDependencies).toEqual(['projectB', 'projectC']);
    });

    it('should not add circular dependencies', async () => {
        const circularOptions: LinkGeneratorSchema = {
            targets: 'projectA',
            dependencies: 'projectA, projectB',
        };

        await linkGenerator(tree, circularOptions);

        const projectAConfig = readProjectConfiguration(tree, 'projectA');
        expect(projectAConfig.implicitDependencies).toEqual(['projectB']);
    });

    it('should throw an error if target projects do not exist', async () => {
        const invalidOptions: LinkGeneratorSchema = {
            targets: 'nonExistentProject',
            dependencies: 'projectB',
        };

        await expect(linkGenerator(tree, invalidOptions)).rejects.toThrow(
            'Projects nonExistentProject do not exist'
        );
    });

    it('should throw an error if dependency projects do not exist', async () => {
        const invalidOptions: LinkGeneratorSchema = {
            targets: 'projectA',
            dependencies: 'nonExistentProject',
        };

        await expect(linkGenerator(tree, invalidOptions)).rejects.toThrow(
            'Projects nonExistentProject do not exist'
        );
    });
});
