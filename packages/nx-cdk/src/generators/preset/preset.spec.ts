import { Tree, readNxJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { presetGenerator } from './preset';
import { PresetGeneratorSchema } from './schema';

describe('preset generator', () => {
    let tree: Tree;
    const options: PresetGeneratorSchema = { name: 'test', nodeVersion: '24.11.0', example: true };

    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();
    });

    it('should run successfully', async () => {
        await presetGenerator(tree, options);
        const config = readNxJson(tree);
        expect(config).toBeDefined();
    });

    it('should generate example code when example is true', async () => {
        await presetGenerator(tree, options);

        const infraIndex = tree.read('libs/infra/src/index.ts', 'utf-8');
        expect(infraIndex).toBeDefined();
        expect(infraIndex).toContain('paramExample');
        expect(infraIndex).toContain('secretExample');
    });

    it('should generate without example code when example is false', async () => {
        await presetGenerator(tree, { ...options, example: false });

        const infraIndex = tree.read('libs/infra/src/index.ts', 'utf-8');
        expect(infraIndex).toBeDefined();
        expect(infraIndex).not.toContain('paramExample');
        expect(infraIndex).not.toContain('secretExample');
    });

    it('should not contain inline Lambda bundling code in vite base config', async () => {
        await presetGenerator(tree, options);

        const baseConfig = tree.read('vite.config.base.mjs', 'utf-8');
        expect(baseConfig).toBeDefined();
        expect(baseConfig).not.toContain('defineLambdaEnvironments');
        expect(baseConfig).not.toContain('shimBanner');
        expect(baseConfig).not.toContain('stripUnneededPlugins');
    });

    it('should include @aligent/vite-plugin-handler in generated devDependencies', async () => {
        await presetGenerator(tree, options);

        const packageJson = tree.read('package.json', 'utf-8');
        expect(packageJson).toBeDefined();
        expect(packageJson).toContain('@aligent/vite-plugin-handler');
    });
});
