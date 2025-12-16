import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { serviceGenerator } from './generator';
import { ServiceGeneratorSchema } from './schema';

const application = {
    name: 'application',
    type: 'module',
    main: './bin/main.ts',
    types: './bin/main.ts',
    nx: { tags: ['scope:application'] },
};

describe('service generator', () => {
    let tree: Tree;
    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();
        tree.write(
            'tsconfig.json',
            `{
                "extends": "./tsconfig.base.json",
                "compileOnSave": false,
                "files": [],
                "references": []
            }`
        );
        tree.write('application/package.json', JSON.stringify(application));
    });

    it('should run successfully', async () => {
        const options: ServiceGeneratorSchema = { name: 'test' };
        await expect(serviceGenerator(tree, options)).resolves.not.toThrow();
    });

    it('should add the project reference to tsconfig.json', async () => {
        const options: ServiceGeneratorSchema = { name: 'test' };

        await serviceGenerator(tree, options);

        const tsconfig = tree.read('tsconfig.json', 'utf-8');

        assert.isNotNull(tsconfig);

        const references = JSON.parse(tsconfig).references;

        expect(references).toEqual([{ path: './services/test' }]);
    });
});
