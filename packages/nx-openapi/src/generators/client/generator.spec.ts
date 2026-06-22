import { Tree, addProjectConfiguration, readProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { clientGenerator } from './generator';
import { ClientGeneratorSchema } from './schema';

describe('client generator', () => {
    let tree: Tree;
    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();
    });

    it('should generate a client without an initial folder successfully', async () => {
        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/valid.yaml`,
            skipValidate: false,
            override: false,
            authMethod: 'api-key',
        };
        await clientGenerator(tree, options);

        expect(readProjectConfiguration(tree, 'clients')).toBeDefined();
        expect(tree.exists('clients/src/test/schema.yaml')).toBe(true);
        expect(tree.exists('clients/src/test/generated-types.ts')).toBe(true);
        expect(tree.exists('clients/src/test/client.ts')).toBe(true);
    });

    it('should generate a client in an existing project successfully', async () => {
        addProjectConfiguration(tree, 'test', {
            root: 'clients',
            projectType: 'library',
            sourceRoot: 'clients/src/',
            targets: {},
            tags: ['clients'],
        });

        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/valid.yaml`,
            skipValidate: true,
            override: false,
            authMethod: 'api-key',
        };

        await clientGenerator(tree, options);

        expect(tree.exists('clients/src/test/schema.yaml')).toBe(true);
        expect(tree.exists('clients/src/test/generated-types.ts')).toBe(true);
        expect(tree.exists('clients/src/test/client.ts')).toBe(true);
    });

    it('should throw an error if schemaPath does point to a supported file type', async () => {
        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/random.xml`,
            skipValidate: false,
            override: false,
            authMethod: 'api-key',
        };
        await expect(clientGenerator(tree, options)).rejects.toThrowError();
    });

    it('should throw an error if schema file is not found', async () => {
        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/missing.yaml`,
            skipValidate: true,
            override: false,
            authMethod: 'api-key',
        };
        await expect(clientGenerator(tree, options)).rejects.toThrowError();
    });

    it('should throw error when validation failed (has problem with severity `error`)', async () => {
        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/invalid.yaml`,
            skipValidate: false,
            override: false,
            authMethod: 'api-key',
        };

        await expect(clientGenerator(tree, options)).rejects.toThrowError();
    });

    it('should throw error when validation failed due to unsupported specification', async () => {
        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/unsupported.yaml`,
            skipValidate: false,
            override: false,
            authMethod: 'api-key',
        };

        await expect(clientGenerator(tree, options)).rejects.toThrowError();
    });

    it('should throw error when directory already exists without override flag', async () => {
        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/valid.yaml`,
            skipValidate: true,
            override: false,
            authMethod: 'api-key',
        };

        // First generation
        await clientGenerator(tree, options);

        // Second generation without override should throw
        await expect(clientGenerator(tree, options)).rejects.toThrow(
            'Directory "test" already exists'
        );
    });

    it('should override existing client when override flag is set', async () => {
        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/valid.yaml`,
            skipValidate: true,
            override: false,
            authMethod: 'api-key',
        };

        // First generation
        await clientGenerator(tree, options);

        // Second generation with override should succeed
        const overrideOptions = { ...options, override: true };
        await expect(clientGenerator(tree, overrideOptions)).resolves.not.toThrow();
    });

    it('should preserve client.ts on override', async () => {
        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/valid.yaml`,
            skipValidate: true,
            override: false,
            authMethod: 'api-key',
        };

        await clientGenerator(tree, options);

        // Simulate user customization
        const clientPath = 'clients/src/test/client.ts';
        tree.write(clientPath, '// custom user code\n');

        await clientGenerator(tree, { ...options, override: true });

        const content = tree.read(clientPath, 'utf-8');
        expect(content).toBe('// custom user code\n');
    });

    it('should remove stale files when overriding with a different schema extension', async () => {
        const yamlOptions: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/valid.yaml`,
            skipValidate: true,
            override: false,
            authMethod: 'api-key',
        };

        // First generation with YAML schema
        await clientGenerator(tree, yamlOptions);
        expect(tree.exists('clients/src/test/schema.yaml')).toBe(true);

        // Second generation with JSON schema and override
        const jsonOptions: ClientGeneratorSchema = {
            ...yamlOptions,
            schemaPath: `${__dirname}/unit-test-schemas/valid.json`,
            override: true,
        };
        await clientGenerator(tree, jsonOptions);

        expect(tree.exists('clients/src/test/schema.json')).toBe(true);
        expect(tree.exists('clients/src/test/schema.yaml')).toBe(false);
    });

    it('should not duplicate index export when overriding', async () => {
        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/valid.yaml`,
            skipValidate: true,
            override: false,
            authMethod: 'api-key',
        };

        await clientGenerator(tree, options);
        await clientGenerator(tree, { ...options, override: true });

        const indexContent = tree.read('clients/src/index.ts', 'utf-8');
        expect(indexContent).not.toBeNull();
        const matches = indexContent!.match(/\.\/test\/client/g);
        expect(matches).toHaveLength(1);
    });

    it('should add tsconfig path when using tsconfig.base.json', async () => {
        // Create tsconfig.base.json instead of tsconfig.json
        tree.delete('tsconfig.json');
        tree.write(
            'tsconfig.base.json',
            JSON.stringify({
                compilerOptions: {
                    paths: {},
                },
            })
        );

        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/valid.yaml`,
            skipValidate: true,
            override: false,
            authMethod: 'api-key',
        };

        await clientGenerator(tree, options);

        const tsconfig = JSON.parse(tree.read('tsconfig.base.json', 'utf-8')!);
        expect(tsconfig.compilerOptions.paths['@clients']).toBeDefined();
    });

    it('should include logMiddleware in generated client', async () => {
        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/valid.yaml`,
            skipValidate: true,
            override: false,
            authMethod: 'api-key',
        };
        await clientGenerator(tree, options);

        const clientContent = tree.read('clients/src/test/client.ts', 'utf-8');
        expect(clientContent).toContain('logMiddleware');
        expect(clientContent).toContain("logMiddleware('Test')");
    });

    describe('authMethod option', () => {
        it('should generate client with apiKeyAuthMiddleware for api-key auth method', async () => {
            const options: ClientGeneratorSchema = {
                name: 'test',
                schemaPath: `${__dirname}/unit-test-schemas/valid.yaml`,
                skipValidate: true,
                override: false,
                authMethod: 'api-key',
            };

            await clientGenerator(tree, options);

            const clientContent = tree.read('clients/src/test/client.ts', 'utf-8');
            expect(clientContent).toContain('apiKeyAuthMiddleware');
            expect(clientContent).toContain('fetchSsmParams');
        });

        it.each<{ authMethod: string; middlewareName: string }>([
            { authMethod: 'api-key', middlewareName: 'apiKeyAuthMiddleware' },
            { authMethod: 'oauth1.0a', middlewareName: 'oAuth10aAuthMiddleware' },
            { authMethod: 'basic', middlewareName: 'basicAuthMiddleware' },
            { authMethod: 'oauth2.0', middlewareName: 'oAuth20AuthMiddleware' },
        ])(
            'should generate client with $middlewareName when authMethod is $authMethod',
            async ({ authMethod, middlewareName }) => {
                const options: ClientGeneratorSchema = {
                    name: 'test',
                    schemaPath: `${__dirname}/unit-test-schemas/valid.yaml`,
                    skipValidate: true,
                    override: false,
                    authMethod,
                };

                await clientGenerator(tree, options);

                const clientContent = tree.read('clients/src/test/client.ts', 'utf-8');
                expect(clientContent).toContain(middlewareName);
            }
        );

        it('should only include fetchSsmParams import for api-key auth method', async () => {
            const options: ClientGeneratorSchema = {
                name: 'test',
                schemaPath: `${__dirname}/unit-test-schemas/valid.yaml`,
                skipValidate: true,
                override: false,
                authMethod: 'basic',
            };

            await clientGenerator(tree, options);

            const clientContent = tree.read('clients/src/test/client.ts', 'utf-8');
            expect(clientContent).not.toContain('fetchSsmParams');
        });
    });
});
