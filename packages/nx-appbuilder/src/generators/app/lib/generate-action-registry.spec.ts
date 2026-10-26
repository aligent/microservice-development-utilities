import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Runs the registry script template (it has no EJS placeholders, so the
 * template *is* the script) against a throwaway app directory, the way the
 * `pre-app-build` hook does in a generated app.
 */
const TEMPLATE = path.join(
    __dirname,
    '../files/commerce-backend-ui/scripts/generate-action-registry.mjs.template'
);
const OUT = 'src/commerce-backend-ui-2/web-src/src/action-urls.generated.json';

const APP_CONFIG = `
application:
    runtimeManifest:
        packages:
            myApp:
                actions:
                    get-config:
                        function: src/actions/get-config.ts
                        web: 'yes'
                    raw-hook:
                        function: src/actions/raw-hook.ts
                        web: raw
                    bare-bool:
                        function: src/actions/bare-bool.ts
                        web: true
                    cron-job:
                        function: src/actions/cron-job.ts
                        web: 'no'
extensions:
    commerce/extensibility/1:
        $include: src/commerce-extensibility-1/ext.config.yaml
`;

const EXT_CONFIG = `
runtimeManifest:
    packages:
        app-management:
            actions:
                app-config:
                    function: .generated/actions/app-management/app-config.js
                    web: yes
`;

describe('generate-action-registry.mjs', () => {
    let appRoot: string;

    beforeEach(() => {
        appRoot = mkdtempSync(path.join(tmpdir(), 'nx-appbuilder-registry-'));
        mkdirSync(path.join(appRoot, 'scripts'));
        mkdirSync(path.join(appRoot, 'src/commerce-backend-ui-2/web-src/src'), { recursive: true });
        mkdirSync(path.join(appRoot, 'src/commerce-extensibility-1'), { recursive: true });
        mkdirSync(path.join(appRoot, 'node_modules'));
        // The generated app depends on js-yaml; borrow this repo's copy.
        symlinkSync(
            path.dirname(require.resolve('js-yaml/package.json')),
            path.join(appRoot, 'node_modules/js-yaml')
        );
        writeFileSync(
            path.join(appRoot, 'scripts/generate-action-registry.mjs'),
            readFileSync(TEMPLATE, 'utf-8')
        );
        writeFileSync(path.join(appRoot, 'app.config.yaml'), APP_CONFIG);
        writeFileSync(
            path.join(appRoot, 'src/commerce-extensibility-1/ext.config.yaml'),
            EXT_CONFIG
        );
    });

    afterEach(() => {
        rmSync(appRoot, { recursive: true, force: true });
    });

    function run(env: Record<string, string> = {}): string {
        return execFileSync(process.execPath, ['scripts/generate-action-registry.mjs'], {
            cwd: appRoot,
            encoding: 'utf-8',
            // Scrub any namespace from the host shell so each case controls it.
            env: { PATH: process.env['PATH'] ?? '', ...env },
        });
    }

    function readRegistry(): Record<string, string> {
        return JSON.parse(readFileSync(path.join(appRoot, OUT), 'utf-8'));
    }

    it('writes every web action across the application and $include-d extensions', () => {
        writeFileSync(path.join(appRoot, '.env'), 'AIO_runtime_namespace=12345-acme-stage\n');
        run();

        expect(readRegistry()).toEqual({
            'app-management/app-config':
                'https://12345-acme-stage.adobeioruntime.net/api/v1/web/app-management/app-config',
            'myApp/bare-bool':
                'https://12345-acme-stage.adobeioruntime.net/api/v1/web/myApp/bare-bool',
            'myApp/get-config':
                'https://12345-acme-stage.adobeioruntime.net/api/v1/web/myApp/get-config',
            'myApp/raw-hook':
                'https://12345-acme-stage.adobeioruntime.net/api/v1/web/myApp/raw-hook',
        });
    });

    it('honours AIO_runtime_apihost for non-default runtimes', () => {
        writeFileSync(
            path.join(appRoot, '.env'),
            'AIO_runtime_namespace=12345-acme-stage\nAIO_runtime_apihost=https://runtime.example.test\n'
        );
        run();

        expect(readRegistry()['myApp/get-config']).toBe(
            'https://12345-acme-stage.runtime.example.test/api/v1/web/myApp/get-config'
        );
    });

    it('lets an exported namespace win over .env', () => {
        writeFileSync(path.join(appRoot, '.env'), 'AIO_runtime_namespace=from-dotenv\n');
        run({ AIO_runtime_namespace: 'from-shell' });

        expect(readRegistry()['myApp/get-config']).toContain('https://from-shell.');
    });

    it('fails with a workspace hint when no namespace is available', () => {
        expect(() => run()).toThrow(/AIO_runtime_namespace is not set.*aio app use/s);
    });

    it('fails rather than writing an empty registry when nothing is web-exported', () => {
        writeFileSync(path.join(appRoot, '.env'), 'AIO_runtime_namespace=12345-acme-stage\n');
        writeFileSync(
            path.join(appRoot, 'app.config.yaml'),
            'application:\n    runtimeManifest:\n        packages:\n            myApp:\n                actions:\n                    cron-job:\n                        web: "no"\n'
        );

        expect(() => run()).toThrow(/No web actions found/);
    });
});
