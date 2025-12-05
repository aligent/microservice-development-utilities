import { Tree, readNxJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { presetGenerator } from './preset';
import { PresetGeneratorSchema } from './schema';

describe('preset generator', () => {
    let tree: Tree;
    const options: PresetGeneratorSchema = { name: 'test', nodeVersion: '24.11.0' };

    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();
    });

    it('should run successfully', async () => {
        await presetGenerator(tree, options);
        const config = readNxJson(tree);
        expect(config).toBeDefined();
    });
});
