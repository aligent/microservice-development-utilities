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
        it('derives packageName, runtimePackageName, appSlug, extensionId', () => {
            const result = normalizeOptions(tree, { name: 'my-cool-app' });

            expect(result.packageName).toBe('@aligent/my-cool-app');
            expect(result.runtimePackageName).toBe('myCoolApp');
            expect(result.appSlug).toBe('my_cool_app');
            expect(result.extensionId).toBe('myCoolAppExtension');
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

    describe('sidebarCategory handling', () => {
        it('forces sidebarCategory to "none" when hasAdminUI is false', () => {
            const result = normalizeOptions(tree, {
                name: 'my-app',
                hasAdminUI: false,
                sidebarCategory: 'sales',
            });
            expect(result.sidebarCategory).toBe('none');
            expect(result.sidebarCategoryTitle).toBe('');
        });

        it('preserves sidebarCategory when hasAdminUI is true', () => {
            const result = normalizeOptions(tree, {
                name: 'my-app',
                hasAdminUI: true,
                sidebarCategory: 'sales',
            });
            expect(result.sidebarCategory).toBe('sales');
            expect(result.sidebarCategoryTitle).toBe('Sales Apps');
        });

        it('defaults sidebarCategory to "none" when hasAdminUI is true but unset', () => {
            const result = normalizeOptions(tree, {
                name: 'my-app',
                hasAdminUI: true,
            });
            expect(result.sidebarCategory).toBe('none');
            expect(result.sidebarCategoryTitle).toBe('');
        });

        it.each([
            ['catalog', 'Catalog Apps'],
            ['sales', 'Sales Apps'],
            ['customers', 'Customer Apps'],
            ['content', 'Content Apps'],
        ] as const)('maps sidebarCategory %s to title "%s"', (category, title) => {
            const result = normalizeOptions(tree, {
                name: 'my-app',
                hasAdminUI: true,
                sidebarCategory: category,
            });
            expect(result.sidebarCategoryTitle).toBe(title);
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
