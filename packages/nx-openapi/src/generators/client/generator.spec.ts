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
        };
        await clientGenerator(tree, options);

        expect(readProjectConfiguration(tree, 'clients')).toBeDefined();
        expect(tree.exists('clients/src/test/schema.yaml')).toBe(true);
        expect(tree.exists('clients/src/test/types.ts')).toBe(true);
        expect(tree.exists('clients/src/test/client.ts')).toBe(true);
    });

    it('should generate a client in an existing project succesfully', async () => {
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
        };

        await clientGenerator(tree, options);

        expect(tree.exists('clients/src/test/schema.yaml')).toBe(true);
        expect(tree.exists('clients/src/test/types.ts')).toBe(true);
        expect(tree.exists('clients/src/test/client.ts')).toBe(true);
    });

    it('should throw an error if schemaPath does point to a supported file type', async () => {
        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/random.xml`,
            skipValidate: false,
            override: false,
        };
        await expect(clientGenerator(tree, options)).rejects.toThrowError();
    });

    it('should throw an error if schema file is not found', async () => {
        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/missing.yaml`,
            skipValidate: true,
            override: false,
        };
        await expect(clientGenerator(tree, options)).rejects.toThrowError();
    });

    it('should throw error when validation failed (has problem with severity `error`)', async () => {
        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/invalid.yaml`,
            skipValidate: false,
            override: false,
        };

        await expect(clientGenerator(tree, options)).rejects.toThrowError();
    });

    it('should throw error when validation failed due to unsupported specification', async () => {
        const options: ClientGeneratorSchema = {
            name: 'test',
            schemaPath: `${__dirname}/unit-test-schemas/unsupported.yaml`,
            skipValidate: false,
            override: false,
        };

        await expect(clientGenerator(tree, options)).rejects.toThrowError();
    });
});
