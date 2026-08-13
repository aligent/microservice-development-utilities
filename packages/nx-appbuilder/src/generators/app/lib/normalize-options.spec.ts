import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeOptions } from './normalize-options';

describe('normalizeOptions', () => {
    let tree: Tree;

    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();
    });

    describe('name validation', () => {
        it('throws when the path already exists in the tree', () => {
            tree.write('my-app/.gitkeep', '');
            expect(() => normalizeOptions(tree, { name: 'my-app' })).toThrow(/already exists/);
        });
    });

    describe('derived fields', () => {
        it('derives packageName, runtimePackageName, appSlug', () => {
            const result = normalizeOptions(tree, { name: 'my-cool-app' });

            expect(result.packageName).toBe('@aligent/my-cool-app');
            expect(result.runtimePackageName).toBe('myCoolApp');
            // adminUi.menu.id rejects hyphens, so the slug underscores them.
            expect(result.appSlug).toBe('my_cool_app');
            expect(result.appRoot).toBe('my-cool-app');
        });

        it('defaults displayName to title-cased name', () => {
            const result = normalizeOptions(tree, { name: 'my-cool-app' });
            expect(result.displayName).toBe('My Cool App');
        });

        it('preserves an explicit displayName', () => {
            const result = normalizeOptions(tree, {
                name: 'my-app',
                displayName: 'Custom Display',
            });
            expect(result.displayName).toBe('Custom Display');
        });

        it('defaults description to empty string', () => {
            const result = normalizeOptions(tree, { name: 'my-app' });
            expect(result.description).toBe('');
        });
    });

    describe('parentMenu handling', () => {
        it('forces parentMenu to "none" when hasAdminUI is false', () => {
            const result = normalizeOptions(tree, {
                name: 'my-app',
                hasAdminUI: false,
                parentMenu: 'sales',
            });
            expect(result.parentMenu).toBe('none');
        });

        it('preserves parentMenu when hasAdminUI is true', () => {
            const result = normalizeOptions(tree, {
                name: 'my-app',
                hasAdminUI: true,
                parentMenu: 'sales',
            });
            expect(result.parentMenu).toBe('sales');
        });

        it('defaults parentMenu to "none" when hasAdminUI is true but unset', () => {
            const result = normalizeOptions(tree, {
                name: 'my-app',
                hasAdminUI: true,
            });
            expect(result.parentMenu).toBe('none');
        });

        it.each([
            'sales',
            'catalog',
            'customers',
            'marketing',
            'content',
            'reports',
            'stores',
            'system',
        ] as const)('passes the Commerce parent menu %s through untouched', parentMenu => {
            const result = normalizeOptions(tree, {
                name: 'my-app',
                hasAdminUI: true,
                parentMenu,
            });
            expect(result.parentMenu).toBe(parentMenu);
        });
    });

    describe('nodeVersion', () => {
        it('reads the workspace .nvmrc and strips the leading v', () => {
            tree.write('.nvmrc', 'v24.0.1\n');
            const result = normalizeOptions(tree, { name: 'my-app' });
            expect(result.nodeVersion).toBe('24.0.1');
        });

        it('falls back to 24.0.1 when .nvmrc is missing', () => {
            const result = normalizeOptions(tree, { name: 'my-app' });
            expect(result.nodeVersion).toBe('24.0.1');
        });

        it('falls back to 24.0.1 when .nvmrc content is unparseable', () => {
            tree.write('.nvmrc', 'lts/iron\n');
            const result = normalizeOptions(tree, { name: 'my-app' });
            expect(result.nodeVersion).toBe('24.0.1');
        });
    });

    describe('feature flag defaults', () => {
        it('defaults all feature flags to false when omitted', () => {
            const result = normalizeOptions(tree, { name: 'my-app' });
            expect(result.hasAdminUI).toBe(false);
            expect(result.hasBusinessConfig).toBe(false);
            expect(result.hasCommerceWebhooks).toBe(false);
            expect(result.hasEvents).toBe(false);
            expect(result.hasRestActions).toBe(false);
            expect(result.hasScheduledActions).toBe(false);
            expect(result.hasCustomInstallSteps).toBe(false);
        });

        it('preserves all feature flags when provided', () => {
            const result = normalizeOptions(tree, {
                name: 'my-app',
                hasAdminUI: true,
                hasBusinessConfig: true,
                hasCommerceWebhooks: true,
                hasEvents: true,
                hasRestActions: true,
                hasScheduledActions: true,
                hasCustomInstallSteps: true,
            });
            expect(result.hasAdminUI).toBe(true);
            expect(result.hasBusinessConfig).toBe(true);
            expect(result.hasCommerceWebhooks).toBe(true);
            expect(result.hasEvents).toBe(true);
            expect(result.hasRestActions).toBe(true);
            expect(result.hasScheduledActions).toBe(true);
            expect(result.hasCustomInstallSteps).toBe(true);
        });
    });
});
