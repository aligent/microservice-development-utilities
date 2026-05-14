import { type Tree } from '@nx/devkit';
import { loadTemplatePackage, pickVersions } from '../../helpers/template-package';
import type { NormalizedSchema } from '../schema';

/**
 * Builds the new app's package.json based on selected flags.
 *
 * Versions are sourced from `template-package/package.json` (a real package.json
 * that Dependabot watches) — bumping a dependency there flows into every app
 * scaffolded thereafter without code changes. The manifest lives in its own
 * directory because Dependabot's npm ecosystem only discovers files named
 * exactly `package.json`.
 */
const TEMPLATE = loadTemplatePackage(__dirname);

const BASE_DEPS = pickVersions(TEMPLATE.dependencies, [
    '@adobe/aio-sdk',
    '@adobe/aio-lib-telemetry',
]);

const COMMERCE_DEPS = pickVersions(TEMPLATE.dependencies, [
    '@adobe/aio-commerce-lib-app',
    '@adobe/aio-commerce-lib-config',
]);

const ADMIN_UI_DEPS = pickVersions(TEMPLATE.dependencies, [
    '@adobe/uix-guest',
    '@adobe/exc-app',
    '@adobe/react-spectrum',
    'react',
    'react-dom',
    'react-router',
]);

const BASE_DEV_DEPS = pickVersions(TEMPLATE.devDependencies, [
    '@aligent/ts-code-standards',
    '@babel/preset-env',
    '@babel/preset-typescript',
    '@types/node',
    'babel-loader',
    // `eslint` is also pinned at the workspace root; declaring it here keeps
    // the app's `lint` script resolvable independent of npm workspace hoisting.
    'eslint',
    // `prettier` is required as a peer dep of `eslint-plugin-prettier`, which
    // is wired in via `@aligent/ts-code-standards`. Without an explicit
    // declaration the lint run can hang in the dynamic-import fallback path.
    'prettier',
    'ts-loader',
    'type-fest',
    'typescript',
    'vitest',
]);

const ADMIN_UI_DEV_DEPS = pickVersions(TEMPLATE.devDependencies, [
    '@types/react',
    '@types/react-dom',
]);

export function writePackageJson(tree: Tree, options: NormalizedSchema): void {
    const dependencies: Record<string, string> = { ...BASE_DEPS };
    const devDependencies: Record<string, string> = { ...BASE_DEV_DEPS };

    const usesCommerceLib =
        options.hasAdminUI || options.hasBusinessConfig || options.hasCommerceWebhooks;

    if (usesCommerceLib) {
        Object.assign(dependencies, COMMERCE_DEPS);
    }

    if (options.hasAdminUI) {
        Object.assign(dependencies, ADMIN_UI_DEPS);
        Object.assign(devDependencies, ADMIN_UI_DEV_DEPS);
    }

    // Inline tsc invocations rather than going through `npm run` so the
    // scripts (and the nx target that wraps them) work the same under npm,
    // yarn, pnpm, etc. — none of them need a specific package manager binary
    // to be on PATH.
    const TYPECHECK_ACTIONS = 'tsc --noEmit --project src/actions/tsconfig.json';
    const TYPECHECK_TESTS = 'tsc --noEmit --project tests/tsconfig.json';
    const TYPECHECK_WEB = 'tsc --noEmit --project src/commerce-backend-ui-1/web-src/tsconfig.json';

    const scripts: Record<string, string> = {
        lint: 'eslint .',
        'lint:fix': 'eslint . --fix',
        'check-types:actions': TYPECHECK_ACTIONS,
        'check-types:tests': TYPECHECK_TESTS,
        test: 'vitest run --passWithNoTests',
    };

    const checkTypeSteps: string[] = [TYPECHECK_ACTIONS];

    if (options.hasAdminUI) {
        scripts['check-types:web'] = TYPECHECK_WEB;
        checkTypeSteps.push(TYPECHECK_WEB);
    }

    checkTypeSteps.push(TYPECHECK_TESTS);
    scripts['check-types'] = checkTypeSteps.join(' && ');

    const major = options.nodeVersion.split('.')[0];

    const json = {
        name: options.packageName,
        version: '0.0.1',
        description: options.description,
        private: true,
        type: 'commonjs' as const,
        scripts: orderScripts(scripts),
        dependencies: sortObject(dependencies),
        devDependencies: sortObject(devDependencies),
        engines: { node: `>=${major}` },
        nx: {
            targets: {
                'check-types': {
                    executor: 'nx:run-commands',
                    options: { command: scripts['check-types'], cwd: '{projectRoot}' },
                },
                deploy: {
                    executor: 'nx:run-commands',
                    options: { command: 'aio app deploy', cwd: '{projectRoot}' },
                },
            },
        },
    };

    tree.write(`${options.appRoot}/package.json`, JSON.stringify(json, null, 4) + '\n');
}

function sortObject(obj: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

function orderScripts(scripts: Record<string, string>): Record<string, string> {
    const order = [
        'lint',
        'lint:fix',
        'check-types',
        'check-types:actions',
        'check-types:web',
        'check-types:tests',
        'test',
    ];
    const ordered: Record<string, string> = {};
    for (const key of order) {
        const value = scripts[key];
        if (value !== undefined) ordered[key] = value;
    }
    for (const [key, value] of Object.entries(scripts)) {
        if (!(key in ordered)) ordered[key] = value;
    }
    return ordered;
}
