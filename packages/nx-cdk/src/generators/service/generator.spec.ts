import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { serviceGenerator } from './generator';
import { ServiceGeneratorSchema } from './schema';

const application = {
    name: 'application',
    type: 'module',
    main: './bin/main.ts',
    types: './bin/main.ts',
    bundleDependencies: ['@libs/infra'],
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

    it('should throw when a duplicate reference path already exists', async () => {
        const options: ServiceGeneratorSchema = { name: 'test' };

        await serviceGenerator(tree, options);

        await expect(serviceGenerator(tree, options)).rejects.toThrow(
            'You already have a library using the import path'
        );
    });

    it('should reject a name that attempts to traverse outside the services directory', async () => {
        const options: ServiceGeneratorSchema = { name: '../../outside-workspace' };

        await expect(serviceGenerator(tree, options)).rejects.toThrow(/Invalid service name/);
    });

    it('should add the service to application bundleDependencies', async () => {
        const options: ServiceGeneratorSchema = { name: 'test' };

        await serviceGenerator(tree, options);

        const packageJson = JSON.parse(tree.read('application/package.json', 'utf-8') ?? '{}');

        expect(packageJson.bundleDependencies).toContain('@services/test');
        expect(packageJson.bundleDependencies).toContain('@libs/infra');
    });

    it('should not recreate the services folder if it already exists', async () => {
        tree.write('services/.gitkeep', '');

        const options: ServiceGeneratorSchema = { name: 'test' };
        await serviceGenerator(tree, options);

        expect(tree.exists('services/.gitkeep')).toBe(true);
    });

    it('should enable step function execution IDs in the handler bundle', async () => {
        await serviceGenerator(tree, { name: 'test' });

        const viteConfig = tree.read('services/test/vite.config.mjs', 'utf-8');
        expect(viteConfig).toContain(
            "handlerBundle('src/runtime/handlers', { stepFunctionExecutionId: true })"
        );
    });

    it('should pass the execution ID from the example step function to its lambda', async () => {
        await serviceGenerator(tree, { name: 'test', example: true });

        const definition = tree.read('services/test/src/infra/stepfunctions/example.yml', 'utf-8');
        expect(definition).toContain('FunctionName: ${ExampleLambda}');
        expect(definition).toContain('"stepFunctionExecutionId": $states.context.Execution.Id');

        const stack = tree.read('services/test/src/index.ts', 'utf-8');
        expect(stack).toContain('lambdaFunctions: [exampleLambda]');
    });
});
