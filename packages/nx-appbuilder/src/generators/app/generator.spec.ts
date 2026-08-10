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

    describe('conditional parentMenu prompt', () => {
        it('prompts for parentMenu when hasAdminUI is true and the value is omitted', async () => {
            promptMock.mockResolvedValueOnce({ parentMenu: 'content' });

            await generate(tree, { name: 'my-app', hasAdminUI: true });

            expect(promptMock).toHaveBeenCalledOnce();
            const cfg = readText(tree, 'my-app/app.commerce.config.ts');
            expect(cfg).toContain("parentMenu: 'content'");
        });

        it('does not prompt when parentMenu is provided', async () => {
            await generate(tree, {
                name: 'my-app',
                hasAdminUI: true,
                parentMenu: 'sales',
            });
            expect(promptMock).not.toHaveBeenCalled();
        });

        it('does not prompt when hasAdminUI is false', async () => {
            await generate(tree, { name: 'my-app' });
            expect(promptMock).not.toHaveBeenCalled();
        });
    });

    describe('name validation', () => {
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

        it('uses the base eslint preset (not react) when hasAdminUI is false', () => {
            const config = readText(tree, 'my-app/eslint.config.mjs');
            expect(config).toContain('eslintConfigs.base');
            expect(config).not.toContain('eslintConfigs.react');
        });

        describe('app-builder eslint guardrails', () => {
            let config: string;
            beforeEach(() => {
                config = readText(tree, 'my-app/eslint.config.mjs');
            });

            it('bans the umbrella @adobe/aio-sdk import', () => {
                // Both the rule and the educational message must survive — if the
                // message drops, contributors lose the pointer to the targeted libs.
                expect(config).toContain("'no-restricted-imports'");
                expect(config).toContain("name: '@adobe/aio-sdk'");
                expect(config).toContain('@adobe/aio-lib-core-logging');
            });

            it('enables no-non-null-assertion (aligns with workspace CLAUDE.md)', () => {
                expect(config).toContain("'@typescript-eslint/no-non-null-assertion': 'error'");
            });

            it('enables prefer-nullish-coalescing (catches `LOG_LEVEL || "info"`)', () => {
                expect(config).toContain("'@typescript-eslint/prefer-nullish-coalescing': 'error'");
            });

            it('bans process.env inside src/**/actions/**', () => {
                expect(config).toContain('src/**/actions/**');
                expect(config).toContain("'no-restricted-syntax'");
                expect(config).toContain("[object.name='process'][property.name='env']");
            });
        });

        it('writes the webpack config for actions', () => {
            expect(tree.exists('my-app/src/actions/webpack-config.cjs')).toBe(true);
        });

        it('writes the app-root webpack config that disables the TS experiment', () => {
            // webpack >= 5.109 defaults `experiments.typescript` to "auto", which
            // activates built-in TS on Node >= 22.6 for any scope without a TS
            // loader — breaking the SDK's plain-JS `.generated` extension builds.
            const cfg = readText(tree, 'my-app/webpack-config.cjs');
            expect(cfg).toContain('typescript: false');
        });

        it('ignores the SDK-generated .generated directories', () => {
            const gitignore = readText(tree, 'my-app/.gitignore');
            expect(gitignore).toContain('src/*/.generated/');
        });

        it('writes the pre-build action type-check hook', () => {
            expect(tree.exists('my-app/hooks/check-action-types.sh')).toBe(true);
        });

        it('maps the @/* alias without baseUrl', () => {
            // `baseUrl` is deprecated in TypeScript 6 (TS5101) and removed in 7,
            // so `paths` carry their prefix explicitly and resolve relative to
            // the config that declares them.
            const base = readJson(tree, 'my-app/tsconfig.base.json');
            expect(base.compilerOptions.baseUrl).toBeUndefined();
            expect(base.compilerOptions.paths['@/*']).toEqual(['./src/*']);

            const tests = readJson(tree, 'my-app/tests/tsconfig.json');
            expect(tests.compilerOptions.baseUrl).toBeUndefined();
            expect(tests.compilerOptions.paths['@/*']).toEqual(['../src/*']);
        });

        it('states tabWidth/printWidth explicitly so the app passes its own lint', () => {
            // eslint-plugin-prettier resolves config with `editorconfig: true` and
            // so honours .editorconfig (4 / 100); Nx's formatFiles() does not.
            // Left implicit, the two disagree and a fresh app fails `npm run lint`.
            const config = readText(tree, 'my-app/prettier.config.mjs');
            expect(config).toContain('tabWidth: 4');
            expect(config).toContain('printWidth: 100');

            const editorconfig = readText(tree, 'my-app/.editorconfig');
            expect(editorconfig).toContain('indent_size = 4');
            expect(editorconfig).toContain('max_line_length = 100');
        });

        it('augments the logging lib types rather than replacing them', () => {
            // Without the leading import this is an ambient module declaration,
            // which shadows the package's own types and makes `Logger(...)`
            // uncallable — `check-types` then fails on the sample actions.
            const shim = readText(
                tree,
                'my-app/global-types/@adobe/aio-lib-core-logging/index.d.ts'
            );
            expect(shim).toContain("import '@adobe/aio-lib-core-logging';");
            expect(shim).toContain("declare module '@adobe/aio-lib-core-logging'");
        });

        it('writes the targeted Adobe lib type augmentation (LogLevel), not an umbrella shim', () => {
            expect(tree.exists('my-app/global-types/@adobe/aio-lib-core-logging/index.d.ts')).toBe(
                true
            );
            // The umbrella `@adobe/aio-sdk` is banned by the generated eslint config,
            // so the shims that used to declare against it are gone too.
            expect(tree.exists('my-app/global-types/@adobe/aio-sdk')).toBe(false);
        });

        it('writes the .editorconfig, .nvmrc and .gitignore (dotted, not __dot__)', () => {
            expect(tree.exists('my-app/.editorconfig')).toBe(true);
            expect(tree.exists('my-app/.nvmrc')).toBe(true);
            expect(tree.exists('my-app/.gitignore')).toBe(true);
        });

        it('omits app.commerce.config.ts from the root tsconfig when no commerce flag is set', () => {
            const ts = readJson(tree, 'my-app/tsconfig.json');
            expect(ts.include).toEqual(['global-types', 'vitest.config.ts', 'src/lib/**/*.ts']);
        });

        it('does NOT write any commerce-specific files when no commerce flag is set', () => {
            expect(tree.exists('my-app/app.commerce.config.ts')).toBe(false);
            expect(tree.exists('my-app/install.yaml')).toBe(false);
            expect(tree.exists('my-app/src/commerce-extensibility-1')).toBe(false);
            expect(tree.exists('my-app/src/commerce-backend-ui-2')).toBe(false);
            expect(tree.exists('my-app/src/commerce-configuration-1')).toBe(false);
        });
    });

    describe('package.json', () => {
        it('uses the scoped name and pins base deps', async () => {
            await generate(tree, { name: 'my-app', description: 'an app' });
            const pkg = readJson(tree, 'my-app/package.json');

            expect(pkg.name).toBe('@aligent/my-app');
            expect(pkg.description).toBe('an app');
            // Apps depend on the targeted logging lib directly; the umbrella
            // `@adobe/aio-sdk` is intentionally not installed (and is banned by
            // the generated eslint config).
            expect(pkg.dependencies['@adobe/aio-lib-core-logging']).toBeDefined();
            expect(pkg.dependencies['@adobe/aio-sdk']).toBeUndefined();
        });

        it('adds commerce-lib deps when hasAdminUI is set', async () => {
            await generate(tree, {
                name: 'my-app',
                hasAdminUI: true,
                parentMenu: 'none',
            });
            const pkg = readJson(tree, 'my-app/package.json');

            expect(pkg.dependencies['@adobe/aio-commerce-lib-app']).toBeDefined();
            expect(pkg.dependencies['react']).toBeDefined();
            expect(pkg.dependencies['@adobe/aio-commerce-lib-admin-ui']).toBeDefined();
        });

        it('is ESM, since the SDK generates ESM into .generated', async () => {
            await generate(tree, { name: 'my-app' });
            const pkg = readJson(tree, 'my-app/package.json');
            expect(pkg.type).toBe('module');
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
                parentMenu: 'sales',
            });
        });

        it('renders the commerce-backend-ui-2 subtree', () => {
            expect(tree.exists('my-app/src/commerce-backend-ui-2/ext.config.yaml')).toBe(true);
            expect(tree.exists('my-app/src/commerce-backend-ui-2/web-src/src/app.tsx')).toBe(true);
            expect(
                tree.exists('my-app/src/commerce-backend-ui-2/web-src/src/pages/main-page.tsx')
            ).toBe(true);
            expect(tree.exists('my-app/extension-manifest.json')).toBe(true);
        });

        it('ships web-src/index.html, which is what stops the SDK scaffolding over our tsconfig', () => {
            // aio-commerce-lib-app's generateWebSrc() returns early when this
            // file exists. Without it the lib overwrites web-src/tsconfig.json
            // on the first build and we lose the @aligent preset.
            expect(tree.exists('my-app/src/commerce-backend-ui-2/web-src/index.html')).toBe(true);
            expect(tree.exists('my-app/src/commerce-backend-ui-2/web-src/tsconfig.json')).toBe(
                true
            );
        });

        it('bootstraps through createExtensionApp rather than hand-rolled UIX registration', () => {
            const app = readText(tree, 'my-app/src/commerce-backend-ui-2/web-src/src/app.tsx');
            expect(app).toContain("from '@adobe/aio-commerce-lib-admin-ui/web'");
            expect(app).toContain('createExtensionApp(');
            expect(app).toContain('extensionId: config.metadata.id');
        });

        it('also renders commerce-extensibility (admin UI implies commerce lib)', () => {
            expect(tree.exists('my-app/app.commerce.config.ts')).toBe(true);
            expect(tree.exists('my-app/install.yaml')).toBe(true);
            expect(tree.exists('my-app/src/commerce-extensibility-1/ext.config.yaml')).toBe(true);
        });

        it('type-checks app.commerce.config.ts via the root project', () => {
            // `adminUi` there drives the whole backend-ui/2 extension, so a typo
            // must fail check-types rather than surfacing at build time.
            const ts = readJson(tree, 'my-app/tsconfig.json');
            expect(ts.include).toContain('app.commerce.config.ts');

            const pkg = readJson(tree, 'my-app/package.json');
            expect(pkg.scripts['check-types']).toContain('--project tsconfig.json');
        });

        it('declares the backend-UI extension in app.config.yaml', () => {
            const yaml = readText(tree, 'my-app/app.config.yaml');
            expect(yaml).toContain('commerce/backend-ui/2');
            expect(yaml).toContain('src/commerce-backend-ui-2/ext.config.yaml');
        });

        it('declares the menu through adminUi in app.commerce.config.ts', () => {
            const cfg = readText(tree, 'my-app/app.commerce.config.ts');
            expect(cfg).toContain('adminUi:');
            expect(cfg).toContain('menu:');
            expect(cfg).toContain("parentMenu: 'sales'");
            // adminUi.menu.id rejects hyphens, so the underscored slug is used.
            expect(cfg).toContain("id: 'my_app'");
        });

        it('uses the react eslint preset when hasAdminUI is true', () => {
            const config = readText(tree, 'my-app/eslint.config.mjs');
            expect(config).toContain('eslintConfigs.react');
        });

        it('sets module=Preserve + moduleResolution=Bundler on the web tsconfig', () => {
            // Bundler resolution is also what lets TypeScript resolve the
            // `#web/*` and `#app.commerce.config` package.json import aliases,
            // which is why there is no `paths` mapping.
            const ts = readJson(tree, 'my-app/src/commerce-backend-ui-2/web-src/tsconfig.json');
            expect(ts.compilerOptions.module).toBe('Preserve');
            expect(ts.compilerOptions.moduleResolution).toBe('Bundler');
            expect(ts.extends).toBe('@aligent/ts-code-standards/tsconfigs-react');
        });

        it('adds the check-types:web and action-registry pre-build hooks', () => {
            expect(tree.exists('my-app/hooks/check-web-types.sh')).toBe(true);
            expect(tree.exists('my-app/hooks/generate-action-registry.sh')).toBe(true);
            expect(tree.exists('my-app/scripts/generate-action-registry.mjs')).toBe(true);

            const yaml = readText(tree, 'my-app/app.config.yaml');
            expect(yaml).toContain('./hooks/check-web-types.sh');
            expect(yaml).toContain('./hooks/generate-action-registry.sh');
        });

        it('ships the ambient declarations that keep check-types green before a build', () => {
            // `.generated/` and the action registry are both gitignored build
            // outputs, so a fresh clone has neither.
            expect(tree.exists('my-app/src/commerce-backend-ui-2/web-src/src/web-env.d.ts')).toBe(
                true
            );
            expect(
                tree.exists(
                    'my-app/src/commerce-backend-ui-2/web-src/src/action-urls.generated.json.d.ts'
                )
            ).toBe(true);
        });
    });

    describe('actions webpack config', () => {
        it('uses esbuild-loader pinned to the workspace Node major', async () => {
            tree.write('.nvmrc', 'v22.18.0\n');
            await generate(tree, { name: 'my-app', hasRestActions: true });
            const cfg = readText(tree, 'my-app/src/actions/webpack-config.cjs');

            expect(cfg).toContain("loader: 'esbuild-loader'");
            expect(cfg).toContain("target: 'node22'");
            expect(cfg).not.toContain('babel-loader');
        });

        it('does not emit a babel.actions.config.js', async () => {
            await generate(tree, { name: 'my-app' });
            expect(tree.exists('my-app/babel.actions.config.js')).toBe(false);
        });

        it('does not emit per-extension webpack configs', async () => {
            await generate(tree, {
                name: 'my-app',
                hasAdminUI: true,
                parentMenu: 'none',
                hasBusinessConfig: true,
            });

            expect(tree.exists('my-app/src/commerce-configuration-1/my-webpack-config.cjs')).toBe(
                false
            );
            expect(tree.exists('my-app/src/commerce-extensibility-1/my-webpack-config.cjs')).toBe(
                false
            );
            expect(tree.exists('my-app/src/commerce-backend-ui-2/webpack-config.cjs')).toBe(false);
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
            expect(tree.exists('my-app/src/commerce-backend-ui-2')).toBe(false);
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

        it('imports Logger from @adobe/aio-lib-core-logging (not the umbrella)', () => {
            // If the sample template ever regresses to `import { Core } from
            // '@adobe/aio-sdk'`, the lint rule we ship would fail on the first
            // `npm run lint` — catch it here before that happens.
            const action = readText(tree, 'my-app/src/actions/rest-sample.ts');
            expect(action).toContain("from '@adobe/aio-lib-core-logging'");
            expect(action).not.toContain("from '@adobe/aio-sdk'");
        });
    });

    describe('hasEvents', () => {
        beforeEach(async () => {
            await generate(tree, { name: 'my-app', hasEvents: true });
        });

        it('writes the sample event handler action', () => {
            expect(tree.exists('my-app/src/actions/handle-sample-event.ts')).toBe(true);
        });

        it('imports Logger from @adobe/aio-lib-core-logging (not the umbrella)', () => {
            const action = readText(tree, 'my-app/src/actions/handle-sample-event.ts');
            expect(action).toContain("from '@adobe/aio-lib-core-logging'");
            expect(action).not.toContain("from '@adobe/aio-sdk'");
        });

        it('pulls in @adobe/aio-lib-events as a runtime dep', () => {
            const pkg = readJson(tree, 'my-app/package.json');
            expect(pkg.dependencies['@adobe/aio-lib-events']).toBeDefined();
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

        it('imports Logger from @adobe/aio-lib-core-logging (not the umbrella)', () => {
            const action = readText(tree, 'my-app/src/actions/cron-sample.ts');
            expect(action).toContain("from '@adobe/aio-lib-core-logging'");
            expect(action).not.toContain("from '@adobe/aio-sdk'");
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
                parentMenu: 'customers',
                hasBusinessConfig: true,
                hasCommerceWebhooks: true,
                hasEvents: true,
                hasRestActions: true,
                hasScheduledActions: true,
                hasCustomInstallSteps: true,
            });
        });

        it('renders every feature subtree', () => {
            expect(tree.exists('my-app/src/commerce-backend-ui-2/ext.config.yaml')).toBe(true);
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
            expect(yaml).toContain('commerce/backend-ui/2');
            expect(yaml).toContain('commerce/configuration/1');
            expect(yaml).toContain('commerce/extensibility/1');
        });

        it('uses the explicit displayName in the admin UI menu and page', () => {
            const cfg = readText(tree, 'my-app/app.commerce.config.ts');
            expect(cfg).toContain("label: 'Kitchen Sink'");
            expect(cfg).toContain("parentMenu: 'customers'");

            const page = readText(
                tree,
                'my-app/src/commerce-backend-ui-2/web-src/src/pages/main-page.tsx'
            );
            expect(page).toContain('Kitchen Sink');
        });
    });
});
