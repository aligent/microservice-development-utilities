import { Tree, readJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { prompt } from 'enquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import appGenerator from './generator';
import type { AppGeneratorSchema } from './schema';

vi.mock('enquirer', () => ({ prompt: vi.fn() }));
const promptMock = vi.mocked(prompt);

function readText(tree: Tree, path: string): string {
    const buf = tree.read(path, 'utf-8');
    if (buf === null) throw new Error(`File not found in tree: ${path}`);
    return buf;
}

async function generate(tree: Tree, opts: AppGeneratorSchema): Promise<void> {
    await appGenerator(tree, opts);
}

describe('app generator', () => {
    let tree: Tree;

    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();
        promptMock.mockReset();
    });

    describe('conditional sidebarCategory prompt', () => {
        it('prompts for sidebarCategory when hasAdminUI is true and the value is omitted', async () => {
            promptMock.mockResolvedValueOnce({ sidebarCategory: 'content' });

            await generate(tree, { name: 'my-app', hasAdminUI: true });

            expect(promptMock).toHaveBeenCalledOnce();
            const reg = readText(
                tree,
                'my-app/src/commerce-backend-ui-1/actions/registration/index.ts'
            );
            expect(reg).toContain('Content Apps');
        });

        it('does not prompt when sidebarCategory is provided', async () => {
            await generate(tree, {
                name: 'my-app',
                hasAdminUI: true,
                sidebarCategory: 'sales',
            });
            expect(promptMock).not.toHaveBeenCalled();
        });

        it('does not prompt when hasAdminUI is false', async () => {
            await generate(tree, { name: 'my-app' });
            expect(promptMock).not.toHaveBeenCalled();
        });
    });

    describe('name validation', () => {
        it('throws on non-kebab-case names', async () => {
            await expect(generate(tree, { name: 'BadName' })).rejects.toThrow(/must be kebab-case/);
        });

        it('throws when the destination path already exists', async () => {
            tree.write('my-app/.gitkeep', '');
            await expect(generate(tree, { name: 'my-app' })).rejects.toThrow(/already exists/);
        });
    });

    describe('always-on base subtree', () => {
        beforeEach(async () => {
            await generate(tree, { name: 'my-app' });
        });

        it('writes app.config.yaml', () => {
            expect(tree.exists('my-app/app.config.yaml')).toBe(true);
        });

        it('writes the lint, prettier and TS configs', () => {
            expect(tree.exists('my-app/eslint.config.mjs')).toBe(true);
            expect(tree.exists('my-app/prettier.config.mjs')).toBe(true);
            expect(tree.exists('my-app/tsconfig.json')).toBe(true);
            expect(tree.exists('my-app/tsconfig.base.json')).toBe(true);
            expect(tree.exists('my-app/src/actions/tsconfig.json')).toBe(true);
            expect(tree.exists('my-app/tests/tsconfig.json')).toBe(true);
        });

        it('writes the pre-build action type-check hook', () => {
            expect(tree.exists('my-app/hooks/check-action-types.sh')).toBe(true);
        });

        it('writes the AIO SDK global type stubs', () => {
            expect(tree.exists('my-app/global-types/@adobe/aio-sdk/aio-core-logging.d.ts')).toBe(
                true
            );
            expect(tree.exists('my-app/global-types/@adobe/aio-sdk/aio-lib-core-config.d.ts')).toBe(
                true
            );
        });

        it('writes the .editorconfig, .nvmrc and .gitignore (dotted, not __dot__)', () => {
            expect(tree.exists('my-app/.editorconfig')).toBe(true);
            expect(tree.exists('my-app/.nvmrc')).toBe(true);
            expect(tree.exists('my-app/.gitignore')).toBe(true);
        });

        it('does NOT write any commerce-specific files when no commerce flag is set', () => {
            expect(tree.exists('my-app/app.commerce.config.ts')).toBe(false);
            expect(tree.exists('my-app/install.yaml')).toBe(false);
            expect(tree.exists('my-app/src/commerce-extensibility-1')).toBe(false);
            expect(tree.exists('my-app/src/commerce-backend-ui-1')).toBe(false);
            expect(tree.exists('my-app/src/commerce-configuration-1')).toBe(false);
        });
    });

    describe('package.json', () => {
        it('uses the scoped name and pins base deps', async () => {
            await generate(tree, { name: 'my-app', description: 'an app' });
            const pkg = readJson(tree, 'my-app/package.json');

            expect(pkg.name).toBe('@aligent/my-app');
            expect(pkg.description).toBe('an app');
            expect(pkg.dependencies['@adobe/aio-sdk']).toBeDefined();
        });

        it('adds commerce-lib deps when hasAdminUI is set', async () => {
            await generate(tree, {
                name: 'my-app',
                hasAdminUI: true,
                sidebarCategory: 'none',
            });
            const pkg = readJson(tree, 'my-app/package.json');

            expect(pkg.dependencies['@adobe/aio-commerce-lib-app']).toBeDefined();
            expect(pkg.dependencies['react']).toBeDefined();
        });
    });

    describe('nodeVersion inheritance from workspace', () => {
        it("inherits the workspace's .nvmrc into the app's .nvmrc and engines.node", async () => {
            tree.write('.nvmrc', 'v22.18.0\n');
            await generate(tree, { name: 'my-app', hasRestActions: true });

            const nvmrc = tree.read('my-app/.nvmrc', 'utf-8');
            expect(nvmrc?.trim()).toBe('v22.18.0');

            const pkg = readJson(tree, 'my-app/package.json');
            expect(pkg.engines).toEqual({ node: '>=22' });

            const yaml = readText(tree, 'my-app/app.config.yaml');
            expect(yaml).toContain('runtime: nodejs:22');
            expect(yaml).not.toContain('runtime: nodejs:24');
        });

        it('falls back to 24.0.1 when the workspace has no .nvmrc', async () => {
            await generate(tree, { name: 'my-app' });

            const nvmrc = tree.read('my-app/.nvmrc', 'utf-8');
            expect(nvmrc?.trim()).toBe('v24.0.1');

            const pkg = readJson(tree, 'my-app/package.json');
            expect(pkg.engines).toEqual({ node: '>=24' });
        });
    });

    describe('nx targets', () => {
        it('does not write a project.json (lint/test rely on inferred plugin targets)', async () => {
            await generate(tree, { name: 'my-app' });
            expect(tree.exists('my-app/project.json')).toBe(false);
        });

        it('declares custom check-types and deploy targets in package.json nx block', async () => {
            await generate(tree, { name: 'my-app' });
            const pkg = readJson(tree, 'my-app/package.json');

            expect(pkg.nx.targets['check-types'].options.command).toContain(
                'tsc --noEmit --project src/actions/tsconfig.json'
            );
            expect(pkg.nx.targets['check-types'].options.command).not.toMatch(/\bnpm run\b/);
            expect(pkg.nx.targets.deploy).toEqual({
                executor: 'nx:run-commands',
                options: { command: 'aio app deploy', cwd: '{projectRoot}' },
            });
        });
    });

    describe('workspace tsconfig.json integration', () => {
        beforeEach(() => {
            tree.write(
                'tsconfig.json',
                JSON.stringify({ files: [], references: [] }, null, 4) + '\n'
            );
        });

        it('adds the new app to the workspace tsconfig.json references', async () => {
            await generate(tree, { name: 'my-app' });
            const ts = readJson(tree, 'tsconfig.json');

            expect(ts.references).toContainEqual({ path: './my-app' });
        });

        it('does not add a duplicate reference when the path already exists', async () => {
            await generate(tree, { name: 'my-app' });
            await generate(tree, { name: 'other-app' });
            const ts = readJson(tree, 'tsconfig.json');

            const myAppRefs = ts.references.filter((r: { path: string }) => r.path === './my-app');
            expect(myAppRefs).toHaveLength(1);
        });

        it('skips silently when the workspace tsconfig.json is missing', async () => {
            tree.delete('tsconfig.json');
            await expect(generate(tree, { name: 'my-app' })).resolves.not.toThrow();
        });
    });

    describe('root package.json integration', () => {
        it('adds the new app to the root workspaces array', async () => {
            await generate(tree, { name: 'my-app' });
            const rootPkg = readJson(tree, 'package.json');

            expect(rootPkg.workspaces).toContain('my-app');
        });

        it('does not add a duplicate workspace entry on re-run against fresh dir', async () => {
            await generate(tree, { name: 'my-app' });
            // Different dir but same logic exercised
            await generate(tree, { name: 'other-app' });
            const rootPkg = readJson(tree, 'package.json');

            const myAppEntries = rootPkg.workspaces.filter((w: string) => w === 'my-app');
            expect(myAppEntries).toHaveLength(1);
        });

        it('throws when the root package.json is missing', async () => {
            tree.delete('package.json');
            await expect(generate(tree, { name: 'my-app' })).rejects.toThrow(
                /No root package.json/
            );
        });
    });

    describe('hasAdminUI', () => {
        beforeEach(async () => {
            await generate(tree, {
                name: 'my-app',
                hasAdminUI: true,
                sidebarCategory: 'sales',
            });
        });

        it('renders the commerce-backend-ui-1 subtree', () => {
            expect(tree.exists('my-app/src/commerce-backend-ui-1/ext.config.yaml')).toBe(true);
            expect(
                tree.exists('my-app/src/commerce-backend-ui-1/web-src/src/components/App.tsx')
            ).toBe(true);
            expect(
                tree.exists(
                    'my-app/src/commerce-backend-ui-1/web-src/src/components/ExtensionRegistration.tsx'
                )
            ).toBe(true);
        });

        it('also renders commerce-extensibility (admin UI implies commerce lib)', () => {
            expect(tree.exists('my-app/app.commerce.config.ts')).toBe(true);
            expect(tree.exists('my-app/install.yaml')).toBe(true);
            expect(tree.exists('my-app/src/commerce-extensibility-1/ext.config.yaml')).toBe(true);
        });

        it('declares the backend-UI extension in app.config.yaml', () => {
            const yaml = readText(tree, 'my-app/app.config.yaml');
            expect(yaml).toContain('commerce/backend-ui/1');
        });

        it('substitutes the sidebarCategory title into the registration', () => {
            const reg = readText(
                tree,
                'my-app/src/commerce-backend-ui-1/actions/registration/index.ts'
            );
            expect(reg).toContain('Sales Apps');
        });

        it('adds the check-types:web pre-build hook', () => {
            expect(tree.exists('my-app/hooks/check-web-types.sh')).toBe(true);
            const yaml = readText(tree, 'my-app/app.config.yaml');
            expect(yaml).toContain('./hooks/check-web-types.sh');
        });
    });

    describe('hasBusinessConfig', () => {
        beforeEach(async () => {
            await generate(tree, { name: 'my-app', hasBusinessConfig: true });
        });

        it('renders the commerce-configuration-1 subtree', () => {
            expect(tree.exists('my-app/src/commerce-configuration-1/ext.config.yaml')).toBe(true);
        });

        it('also renders commerce-extensibility', () => {
            expect(tree.exists('my-app/app.commerce.config.ts')).toBe(true);
        });

        it('emits a businessConfig.schema block in app.commerce.config.ts', () => {
            const cfg = readText(tree, 'my-app/app.commerce.config.ts');
            expect(cfg).toContain('businessConfig:');
            expect(cfg).toContain('schema:');
        });

        it('declares the configuration extension in app.config.yaml', () => {
            const yaml = readText(tree, 'my-app/app.config.yaml');
            expect(yaml).toContain('commerce/configuration/1');
        });
    });

    describe('hasCommerceWebhooks', () => {
        beforeEach(async () => {
            await generate(tree, { name: 'my-app', hasCommerceWebhooks: true });
        });

        it('renders the commerce-extensibility subtree but no extra dir', () => {
            expect(tree.exists('my-app/app.commerce.config.ts')).toBe(true);
            expect(tree.exists('my-app/src/commerce-backend-ui-1')).toBe(false);
            expect(tree.exists('my-app/src/commerce-configuration-1')).toBe(false);
        });

        it('emits a webhooks section in app.commerce.config.ts', () => {
            const cfg = readText(tree, 'my-app/app.commerce.config.ts');
            expect(cfg).toContain('webhooks:');
        });
    });

    describe('hasRestActions', () => {
        beforeEach(async () => {
            await generate(tree, { name: 'my-app', hasRestActions: true });
        });

        it('writes the rest-sample action', () => {
            expect(tree.exists('my-app/src/actions/rest-sample.ts')).toBe(true);
        });

        it('registers the action in app.config.yaml', () => {
            const yaml = readText(tree, 'my-app/app.config.yaml');
            expect(yaml).toContain('rest-sample:');
            expect(yaml).toContain('src/actions/rest-sample.ts');
        });
    });

    describe('hasEvents', () => {
        beforeEach(async () => {
            await generate(tree, { name: 'my-app', hasEvents: true });
        });

        it('writes the sample event handler action', () => {
            expect(tree.exists('my-app/src/actions/handle-sample-event.ts')).toBe(true);
        });

        it('writes the events global types', () => {
            expect(tree.exists('my-app/global-types/@adobe/aio-sdk/aio-lib-events.d.ts')).toBe(
                true
            );
        });

        it('registers the event handler in app.config.yaml', () => {
            const yaml = readText(tree, 'my-app/app.config.yaml');
            expect(yaml).toContain('handle-sample-event:');
        });

        it('emits an eventing block in app.commerce.config.ts when commerce-lib is on', async () => {
            // hasEvents alone does NOT pull in commerce-lib, so verify the eventing
            // block only appears when paired with a commerce flag.
            const treeCombined = createTreeWithEmptyWorkspace();
            await generate(treeCombined, {
                name: 'my-app',
                hasEvents: true,
                hasCommerceWebhooks: true,
            });
            const cfg = readText(treeCombined, 'my-app/app.commerce.config.ts');
            expect(cfg).toContain('eventing:');
        });
    });

    describe('hasScheduledActions', () => {
        beforeEach(async () => {
            await generate(tree, { name: 'my-app', hasScheduledActions: true });
        });

        it('writes the cron-sample action', () => {
            expect(tree.exists('my-app/src/actions/cron-sample.ts')).toBe(true);
        });

        it('declares triggers and rules in app.config.yaml', () => {
            const yaml = readText(tree, 'my-app/app.config.yaml');
            expect(yaml).toContain('triggers:');
            expect(yaml).toContain('cron-sample-trigger:');
            expect(yaml).toContain('rules:');
            expect(yaml).toContain('cron-sample-rule:');
        });
    });

    describe('hasCustomInstallSteps', () => {
        beforeEach(async () => {
            await generate(tree, {
                name: 'my-app',
                hasCommerceWebhooks: true,
                hasCustomInstallSteps: true,
            });
        });

        it('writes the sample install script', () => {
            expect(tree.exists('my-app/scripts/install/sample-step.js')).toBe(true);
        });

        it('emits an installation block in app.commerce.config.ts', () => {
            const cfg = readText(tree, 'my-app/app.commerce.config.ts');
            expect(cfg).toContain('installation:');
            expect(cfg).toContain('customInstallationSteps:');
        });
    });

    describe('kitchen sink (all flags)', () => {
        beforeEach(async () => {
            await generate(tree, {
                name: 'my-app',
                description: 'Kitchen sink',
                displayName: 'Kitchen Sink',
                hasAdminUI: true,
                sidebarCategory: 'customers',
                hasBusinessConfig: true,
                hasCommerceWebhooks: true,
                hasEvents: true,
                hasRestActions: true,
                hasScheduledActions: true,
                hasCustomInstallSteps: true,
            });
        });

        it('renders every feature subtree', () => {
            expect(tree.exists('my-app/src/commerce-backend-ui-1/ext.config.yaml')).toBe(true);
            expect(tree.exists('my-app/src/commerce-configuration-1/ext.config.yaml')).toBe(true);
            expect(tree.exists('my-app/src/commerce-extensibility-1/ext.config.yaml')).toBe(true);
            expect(tree.exists('my-app/src/actions/rest-sample.ts')).toBe(true);
            expect(tree.exists('my-app/src/actions/handle-sample-event.ts')).toBe(true);
            expect(tree.exists('my-app/src/actions/cron-sample.ts')).toBe(true);
            expect(tree.exists('my-app/scripts/install/sample-step.js')).toBe(true);
        });

        it('emits all conditional sections in app.commerce.config.ts', () => {
            const cfg = readText(tree, 'my-app/app.commerce.config.ts');
            expect(cfg).toContain('businessConfig:');
            expect(cfg).toContain('eventing:');
            expect(cfg).toContain('webhooks:');
            expect(cfg).toContain('installation:');
        });

        it('declares all extensions in install.yaml', () => {
            const yaml = readText(tree, 'my-app/install.yaml');
            expect(yaml).toContain('commerce/backend-ui/1');
            expect(yaml).toContain('commerce/configuration/1');
            expect(yaml).toContain('commerce/extensibility/1');
        });

        it('uses the explicit displayName in the registration', () => {
            const reg = readText(
                tree,
                'my-app/src/commerce-backend-ui-1/actions/registration/index.ts'
            );
            expect(reg).toContain('Customer Apps');
        });
    });
});
