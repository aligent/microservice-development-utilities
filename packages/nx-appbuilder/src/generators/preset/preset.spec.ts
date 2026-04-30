import { Tree, readJson, readNxJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { NX_JSON } from './nx-json';
import presetGenerator from './preset';

describe('preset generator', () => {
    let tree: Tree;

    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();
    });

    describe('name validation', () => {
        it('rejects names that are not kebab-case', async () => {
            await expect(presetGenerator(tree, { name: 'MyWorkspace' })).rejects.toThrow(
                /must be kebab-case/
            );
            await expect(presetGenerator(tree, { name: '1foo' })).rejects.toThrow(
                /must be kebab-case/
            );
            await expect(presetGenerator(tree, { name: 'foo_bar' })).rejects.toThrow(
                /must be kebab-case/
            );
        });

        it('accepts kebab-case names', async () => {
            await expect(presetGenerator(tree, { name: 'acme-apps' })).resolves.not.toThrow();
        });
    });

    describe('package.json', () => {
        it('writes a workspace package.json with @aligent/<name> as the name', async () => {
            await presetGenerator(tree, { name: 'acme-apps' });
            const pkg = readJson(tree, 'package.json');

            expect(pkg.name).toBe('@aligent/acme-apps');
            expect(pkg.private).toBe(true);
            expect(pkg.author).toBe('Aligent Consulting');
        });

        it('declares @aligent/nx-appbuilder in devDependencies at the generator version', async () => {
            await presetGenerator(tree, { name: 'acme-apps' });
            const pkg = readJson(tree, 'package.json');

            expect(pkg.devDependencies).toHaveProperty('@aligent/nx-appbuilder');
            expect(pkg.devDependencies['@aligent/nx-appbuilder']).toMatch(/^\d+\.\d+\.\d+/);
            expect(pkg.devDependencies.nx).toBe('^22.4.5');
        });

        it('declares @aligent/ts-code-standards so the workspace tsconfig extends resolve', async () => {
            await presetGenerator(tree, { name: 'acme-apps' });
            const pkg = readJson(tree, 'package.json');

            expect(pkg.devDependencies['@aligent/ts-code-standards']).toBeDefined();
        });

        it('declares the @nx plugin packages required by nx.json', async () => {
            await presetGenerator(tree, { name: 'acme-apps' });
            const pkg = readJson(tree, 'package.json');

            expect(pkg.devDependencies['@nx/eslint']).toBeDefined();
            expect(pkg.devDependencies['@nx/js']).toBeDefined();
            expect(pkg.devDependencies['@nx/vitest']).toBeDefined();
        });

        it('emits the canonical workspace scripts', async () => {
            await presetGenerator(tree, { name: 'acme-apps' });
            const pkg = readJson(tree, 'package.json');

            expect(Object.keys(pkg.scripts)).toEqual([
                'lint',
                'lint:all',
                'check-types',
                'check-types:all',
                'test',
                'test:all',
                'build',
                'build:all',
            ]);
        });
    });

    describe('nx.json', () => {
        it('writes nx.json matching the typed NX_JSON constant', async () => {
            await presetGenerator(tree, { name: 'acme-apps' });
            const config = readNxJson(tree);

            expect(config).toBeDefined();
            expect(config?.defaultBase).toBe(NX_JSON.defaultBase);
            expect(config?.namedInputs).toEqual(NX_JSON.namedInputs);
            expect(config?.targetDefaults).toEqual(NX_JSON.targetDefaults);
        });

        it('pins the Nx self-installer to the expected version', async () => {
            await presetGenerator(tree, { name: 'acme-apps' });
            const config = readNxJson(tree);

            expect(config?.installation?.version).toBe('22.4.5');
        });

        it('declares the inference plugins so generated apps get lint/test for free', async () => {
            await presetGenerator(tree, { name: 'acme-apps' });
            const config = readNxJson(tree);

            const pluginNames = (config?.plugins ?? []).map(p =>
                typeof p === 'string' ? p : p.plugin
            );
            expect(pluginNames).toContain('@nx/eslint/plugin');
            expect(pluginNames).toContain('@nx/js/typescript');
            expect(pluginNames).toContain('@nx/vitest');
        });

        it('disables the @nx/js/typescript plugin inferred targets we override ourselves', async () => {
            await presetGenerator(tree, { name: 'acme-apps' });
            const config = readNxJson(tree);

            const tsPlugin = (config?.plugins ?? []).find(
                p => typeof p !== 'string' && p.plugin === '@nx/js/typescript'
            );
            expect(tsPlugin).toBeDefined();
            if (typeof tsPlugin === 'string' || tsPlugin === undefined) return;
            expect(tsPlugin.options).toMatchObject({ build: false, typecheck: false });
        });
    });

    describe('nodeVersion', () => {
        it('writes .nvmrc and engines.node from the default 24.0.1', async () => {
            await presetGenerator(tree, { name: 'acme-apps' });
            const nvmrc = tree.read('.nvmrc', 'utf-8');
            const pkg = readJson(tree, 'package.json');

            expect(nvmrc?.trim()).toBe('v24.0.1');
            expect(pkg.engines).toEqual({ node: '>=24' });
        });

        it('honours an explicit nodeVersion option', async () => {
            await presetGenerator(tree, { name: 'acme-apps', nodeVersion: '22.18.0' });
            const nvmrc = tree.read('.nvmrc', 'utf-8');
            const pkg = readJson(tree, 'package.json');

            expect(nvmrc?.trim()).toBe('v22.18.0');
            expect(pkg.engines).toEqual({ node: '>=22' });
        });
    });

    describe('templated files', () => {
        it('writes the dotted template files at their unsuffixed destinations', async () => {
            await presetGenerator(tree, { name: 'acme-apps' });

            expect(tree.exists('.gitignore')).toBe(true);
            expect(tree.exists('.npmrc')).toBe(true);
            expect(tree.exists('.nvmrc')).toBe(true);
            expect(tree.exists('README.md')).toBe(true);
            expect(tree.exists('.gitignore.template')).toBe(false);
            expect(tree.exists('.npmrc.template')).toBe(false);
        });

        it('writes a workspace tsconfig.json that extends @aligent/ts-code-standards', async () => {
            await presetGenerator(tree, { name: 'acme-apps' });

            expect(tree.exists('tsconfig.json')).toBe(true);
            const ts = readJson(tree, 'tsconfig.json');
            expect(ts.extends).toBe('@aligent/ts-code-standards/tsconfigs-extend');
            expect(ts.files).toEqual([]);
            expect(ts.references).toEqual([]);
        });

        it('substitutes the workspace name into the README', async () => {
            await presetGenerator(tree, { name: 'acme-apps' });
            const readme = tree.read('README.md', 'utf-8');

            expect(readme).toContain('acme-apps');
        });

        it('points the .npmrc at the Aligent corp registry', async () => {
            await presetGenerator(tree, { name: 'acme-apps' });
            const npmrc = tree.read('.npmrc', 'utf-8');

            expect(npmrc).toContain('@aligent:registry=https://npm.corp.aligent.consulting/');
            expect(npmrc).toContain('NPM_TOKEN');
        });
    });
});
