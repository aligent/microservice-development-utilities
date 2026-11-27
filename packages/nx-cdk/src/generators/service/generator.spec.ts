import { logger, Tree } from '@nx/devkit';
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

    describe('service stacks registration', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should warn through the Nx logger when service-stacks.ts does not exist', async () => {
            const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
            const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);

            await serviceGenerator(tree, { name: 'test' });

            expect(warn).toHaveBeenCalledWith(
                expect.stringContaining('application/lib/service-stacks.ts')
            );
            expect(consoleLog).not.toHaveBeenCalled();
        });

        it('should throw a clear error naming the file when ApplicationStage is missing', async () => {
            tree.write('application/lib/service-stacks.ts', 'export const unrelated = 1;');

            await expect(serviceGenerator(tree, { name: 'test' })).rejects.toThrow(
                'Unable to find ApplicationStage in application/lib/service-stacks.ts'
            );
        });
    });

    describe('generated tsconfigs', () => {
        it('should not type-check the generated vite config', async () => {
            await serviceGenerator(tree, { name: 'test' });

            const tsConfigSpec = JSON.parse(
                tree.read('services/test/tsconfig.spec.json', 'utf-8') ?? '{}'
            );

            // The base tsconfig enables checkJs, and the config imports a file outside the service rootDir
            expect(tsConfigSpec.include).not.toContain('vite.config.mjs');
        });

        it('should only reference config files that were generated', async () => {
            await serviceGenerator(tree, { name: 'test' });

            const referenced = ['tsconfig.lib.json', 'tsconfig.spec.json']
                .flatMap(file => {
                    const config = JSON.parse(tree.read(`services/test/${file}`, 'utf-8') ?? '{}');
                    return [...(config.include ?? []), ...(config.exclude ?? [])];
                })
                .filter((entry: string) => /^[\w.-]+\.config\.m?[jt]s$/.test(entry));

            const missing = referenced.filter(file => !tree.exists(`services/test/${file}`));
            expect(missing).toEqual([]);
        });
    });
});
