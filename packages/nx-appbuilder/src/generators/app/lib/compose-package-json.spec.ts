import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { NormalizedSchema } from '../schema';
import { writePackageJson } from './compose-package-json';

function makeOptions(overrides: Partial<NormalizedSchema> = {}): NormalizedSchema {
    return {
        name: 'my-app',
        description: 'Test app',
        displayName: 'My App',
        hasAdminUI: false,
        sidebarCategory: 'none',
        hasBusinessConfig: false,
        hasCommerceWebhooks: false,
        hasEvents: false,
        hasRestActions: false,
        hasScheduledActions: false,
        hasCustomInstallSteps: false,
        appRoot: 'my-app',
        packageName: '@aligent/my-app',
        runtimePackageName: 'myApp',
        appSlug: 'my_app',
        extensionId: 'myAppExtension',
        sidebarCategoryTitle: '',
        ...overrides,
    };
}

function readPackageJson(tree: Tree): {
    name: string;
    description: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    [key: string]: unknown;
} {
    const raw = tree.read('my-app/package.json', 'utf-8');
    if (raw === null) throw new Error('package.json was not written');
    return JSON.parse(raw);
}

describe('writePackageJson', () => {
    let tree: Tree;

    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();
    });

    describe('always-on shape', () => {
        it('writes a valid package.json at the app root', () => {
            writePackageJson(tree, makeOptions());
            expect(tree.exists('my-app/package.json')).toBe(true);
        });

        it('uses the scoped packageName and pinned shape', () => {
            writePackageJson(tree, makeOptions({ description: 'hello' }));
            const pkg = readPackageJson(tree);

            expect(pkg.name).toBe('@aligent/my-app');
            expect(pkg.description).toBe('hello');
            expect(pkg['version']).toBe('0.0.1');
            expect(pkg['private']).toBe(true);
            expect(pkg['type']).toBe('commonjs');
            expect(pkg['engines']).toEqual({ node: '>=18' });
        });

        it('always includes the base @adobe deps and dev tooling', () => {
            writePackageJson(tree, makeOptions());
            const pkg = readPackageJson(tree);

            expect(pkg.dependencies).toMatchObject({
                '@adobe/aio-sdk': expect.any(String),
                '@adobe/aio-lib-telemetry': expect.any(String),
            });
            expect(pkg.devDependencies).toMatchObject({
                '@aligent/ts-code-standards': expect.any(String),
                typescript: expect.any(String),
                vitest: expect.any(String),
            });
        });
    });

    describe('script ordering', () => {
        it('orders the standard scripts in the canonical sequence', () => {
            writePackageJson(tree, makeOptions());
            const keys = Object.keys(readPackageJson(tree).scripts);

            expect(keys).toEqual([
                'lint',
                'lint:fix',
                'check-types',
                'check-types:actions',
                'check-types:tests',
                'test',
            ]);
        });

        it('inserts check-types:web between actions and tests when hasAdminUI', () => {
            writePackageJson(tree, makeOptions({ hasAdminUI: true }));
            const keys = Object.keys(readPackageJson(tree).scripts);

            expect(keys).toEqual([
                'lint',
                'lint:fix',
                'check-types',
                'check-types:actions',
                'check-types:web',
                'check-types:tests',
                'test',
            ]);
        });

        it('chains check-types steps in the right order', () => {
            const optsBare = makeOptions();
            writePackageJson(tree, optsBare);
            expect(readPackageJson(tree).scripts['check-types']).toBe(
                'npm run check-types:actions && npm run check-types:tests'
            );

            const treeUI = createTreeWithEmptyWorkspace();
            writePackageJson(treeUI, makeOptions({ hasAdminUI: true }));
            const raw = treeUI.read('my-app/package.json', 'utf-8');
            const json = JSON.parse(raw ?? '{}');
            expect(json.scripts['check-types']).toBe(
                'npm run check-types:actions && npm run check-types:web && npm run check-types:tests'
            );
        });
    });

    describe('dependency composition', () => {
        it('adds commerce-lib deps when hasAdminUI', () => {
            writePackageJson(tree, makeOptions({ hasAdminUI: true }));
            const pkg = readPackageJson(tree);
            expect(pkg.dependencies['@adobe/aio-commerce-lib-app']).toBeDefined();
            expect(pkg.dependencies['@adobe/aio-commerce-lib-config']).toBeDefined();
        });

        it('adds commerce-lib deps when hasBusinessConfig', () => {
            writePackageJson(tree, makeOptions({ hasBusinessConfig: true }));
            const pkg = readPackageJson(tree);
            expect(pkg.dependencies['@adobe/aio-commerce-lib-app']).toBeDefined();
        });

        it('adds commerce-lib deps when hasCommerceWebhooks', () => {
            writePackageJson(tree, makeOptions({ hasCommerceWebhooks: true }));
            const pkg = readPackageJson(tree);
            expect(pkg.dependencies['@adobe/aio-commerce-lib-app']).toBeDefined();
        });

        it('does NOT add commerce-lib deps when no commerce flag is set', () => {
            writePackageJson(tree, makeOptions({ hasEvents: true, hasRestActions: true }));
            const pkg = readPackageJson(tree);
            expect(pkg.dependencies['@adobe/aio-commerce-lib-app']).toBeUndefined();
        });

        it('adds React + admin-UI runtime deps when hasAdminUI', () => {
            writePackageJson(tree, makeOptions({ hasAdminUI: true }));
            const pkg = readPackageJson(tree);
            expect(pkg.dependencies).toMatchObject({
                react: expect.any(String),
                'react-dom': expect.any(String),
                'react-router': expect.any(String),
                '@adobe/react-spectrum': expect.any(String),
                '@adobe/uix-guest': expect.any(String),
                '@adobe/exc-app': expect.any(String),
            });
            expect(pkg.devDependencies).toMatchObject({
                '@types/react': expect.any(String),
                '@types/react-dom': expect.any(String),
            });
        });

        it('does NOT add React deps when hasAdminUI is false', () => {
            writePackageJson(tree, makeOptions({ hasAdminUI: false }));
            const pkg = readPackageJson(tree);
            expect(pkg.dependencies['react']).toBeUndefined();
            expect(pkg.devDependencies['@types/react']).toBeUndefined();
        });
    });

    describe('alphabetical sort', () => {
        it('sorts dependencies alphabetically', () => {
            writePackageJson(tree, makeOptions({ hasAdminUI: true }));
            const pkg = readPackageJson(tree);
            const depKeys = Object.keys(pkg.dependencies);
            expect(depKeys).toEqual([...depKeys].sort((a, b) => a.localeCompare(b)));
        });

        it('sorts devDependencies alphabetically', () => {
            writePackageJson(tree, makeOptions({ hasAdminUI: true }));
            const pkg = readPackageJson(tree);
            const devKeys = Object.keys(pkg.devDependencies);
            expect(devKeys).toEqual([...devKeys].sort((a, b) => a.localeCompare(b)));
        });
    });
});
