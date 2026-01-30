import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
    addTsConfigPath,
    addTsConfigReference,
    appendToIndexFile,
    getExistingProject,
    getRootTsConfigPathInTree,
    toClassName,
} from './utilities';

describe('utilities', () => {
    let tree: Tree;

    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();
    });

    describe('getExistingProject', () => {
        it('should return undefined for non-existent project', () => {
            const result = getExistingProject(tree, 'non-existent');
            expect(result).toBeUndefined();
        });
    });

    describe('getRootTsConfigPathInTree', () => {
        it('should return tsconfig.base.json if it exists', () => {
            tree.write('tsconfig.base.json', '{}');
            const result = getRootTsConfigPathInTree(tree);
            expect(result).toBe('tsconfig.base.json');
        });

        it('should return tsconfig.json if tsconfig.base.json does not exist', () => {
            tree.delete('tsconfig.base.json');
            tree.write('tsconfig.json', '{}');
            const result = getRootTsConfigPathInTree(tree);
            expect(result).toBe('tsconfig.json');
        });

        it('should return tsconfig.base.json as fallback if neither exists', () => {
            tree.delete('tsconfig.base.json');
            const result = getRootTsConfigPathInTree(tree);
            expect(result).toBe('tsconfig.base.json');
        });
    });

    describe('addTsConfigPath', () => {
        it('should add a new path to tsconfig', () => {
            tree.write('tsconfig.base.json', JSON.stringify({ compilerOptions: {} }));
            addTsConfigPath(tree, 'tsconfig.base.json', '@clients', ['clients/src/index.ts']);

            const tsconfig = JSON.parse(tree.read('tsconfig.base.json', 'utf-8')!);
            expect(tsconfig.compilerOptions.paths['@clients']).toEqual(['clients/src/index.ts']);
        });

        it('should throw error if path already exists', () => {
            tree.write(
                'tsconfig.base.json',
                JSON.stringify({
                    compilerOptions: {
                        paths: {
                            '@clients': ['existing/path'],
                        },
                    },
                })
            );

            expect(() =>
                addTsConfigPath(tree, 'tsconfig.base.json', '@clients', ['clients/src/index.ts'])
            ).toThrow('You already have a library using the import path "@clients"');
        });

        it('should initialize compilerOptions and paths if they do not exist', () => {
            tree.write('tsconfig.base.json', '{}');
            addTsConfigPath(tree, 'tsconfig.base.json', '@clients', ['clients/src/index.ts']);

            const tsconfig = JSON.parse(tree.read('tsconfig.base.json', 'utf-8')!);
            expect(tsconfig.compilerOptions.paths['@clients']).toEqual(['clients/src/index.ts']);
        });
    });

    describe('addTsConfigReference', () => {
        it('should add a new reference to tsconfig', () => {
            tree.write('tsconfig.json', JSON.stringify({ references: [] }));
            addTsConfigReference(tree, 'tsconfig.json', './clients');

            const tsconfig = JSON.parse(tree.read('tsconfig.json', 'utf-8')!);
            expect(tsconfig.references).toContainEqual({ path: './clients' });
        });

        it('should throw error if reference already exists', () => {
            tree.write(
                'tsconfig.json',
                JSON.stringify({
                    references: [{ path: './clients' }],
                })
            );

            expect(() => addTsConfigReference(tree, 'tsconfig.json', './clients')).toThrow(
                'You already have a library using the import path "./clients"'
            );
        });

        it('should initialize references array if it does not exist', () => {
            tree.write('tsconfig.json', '{}');
            addTsConfigReference(tree, 'tsconfig.json', './clients');

            const tsconfig = JSON.parse(tree.read('tsconfig.json', 'utf-8')!);
            expect(tsconfig.references).toContainEqual({ path: './clients' });
        });
    });

    describe('appendToIndexFile', () => {
        it('should append export to index file', () => {
            tree.write('clients/src/index.ts', '// existing content\n');
            appendToIndexFile(tree, 'clients', 'my-client');

            const content = tree.read('clients/src/index.ts', 'utf-8');
            expect(content).toContain('export * from "./my-client/client";');
        });
    });

    describe('toClassName', () => {
        it('should convert kebab-case to PascalCase', () => {
            expect(toClassName('my-client')).toBe('MyClient');
        });

        it('should handle single word', () => {
            expect(toClassName('client')).toBe('Client');
        });

        it('should handle multiple hyphens', () => {
            expect(toClassName('my-awesome-api-client')).toBe('MyAwesomeApiClient');
        });

        it('should trim whitespace', () => {
            expect(toClassName('  my-client  ')).toBe('MyClient');
        });
    });
});
