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

// Adobe ships an umbrella `@adobe/aio-sdk` that re-exports every sub-SDK
// (Files, State, Events, Target, Analytics, ...). Importing the umbrella
// drags all of them into the action bundle even when only `Core.Logger` is
// used. We pin the targeted libs instead — and the matching `no-restricted-
// imports` lint rule in the generated app's eslint config keeps app code
// honest. See `app/files/base/eslint.config.mjs.template`.
const BASE_DEPS = pickVersions(TEMPLATE.dependencies, [
    '@adobe/aio-lib-core-logging',
    '@adobe/aio-lib-telemetry',
]);

const COMMERCE_DEPS = pickVersions(TEMPLATE.dependencies, [
    '@adobe/aio-commerce-lib-app',
    '@adobe/aio-commerce-lib-config',
]);

// Only pulled in when the `events` subtree is rendered — that subtree's
// global-types shim re-exports `init` from the package, so the package must
// resolve at type-check time.
const EVENT_DEPS = pickVersions(TEMPLATE.dependencies, ['@adobe/aio-lib-events']);

// `@adobe/aio-commerce-lib-app` would normally declare and install these itself
// while scaffolding `web-src` — but that scaffolding step short-circuits when
// `web-src/index.html` already exists, which is exactly what we ship (so it can't
// clobber our tsconfig). Declaring the same set here keeps a fresh `npm install`
// complete. Versions mirror the lib's own `WEB_SOURCE_DEPENDENCIES`.
const ADMIN_UI_DEPS = pickVersions(TEMPLATE.dependencies, [
    '@adobe/aio-commerce-lib-admin-ui',
    '@react-spectrum/s2',
    'react',
    'react-dom',
]);

const BASE_DEV_DEPS = pickVersions(TEMPLATE.devDependencies, [
    '@aligent/ts-code-standards',
    '@types/node',
    'esbuild-loader',
    // `eslint` is also pinned at the workspace root; declaring it here keeps
    // the app's `lint` script resolvable independent of npm workspace hoisting.
    // Both must agree on a major — `@aligent/ts-code-standards` bundles
    // `eslint-plugin-react@7`, which throws on ESLint 10 (`getFilename is not a
    // function`) as soon as an app uses the `react` preset.
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

    if (options.hasEvents) {
        Object.assign(dependencies, EVENT_DEPS);
    }

    if (options.hasAdminUI) {
        Object.assign(dependencies, ADMIN_UI_DEPS);
        Object.assign(devDependencies, ADMIN_UI_DEV_DEPS);
    }

    // Inline tsc invocations rather than going through `npm run` so the
    // scripts (and the nx target that wraps them) work the same under npm,
    // yarn, pnpm, etc. — none of them need a specific package manager binary
    // to be on PATH.
    // The root project covers everything the per-area projects don't:
    // `global-types`, `vitest.config.ts`, shared code under `src/lib/`, and —
    // when the commerce lib is in play — `app.commerce.config.ts`. That last one
    // matters most: `adminUi` there drives the whole backend-ui/2 extension, so
    // without this a typo surfaces at build time instead of type-check time.
    const TYPECHECK_APP = 'tsc --noEmit --project tsconfig.json';
    const TYPECHECK_ACTIONS = 'tsc --noEmit --project src/actions/tsconfig.json';
    const TYPECHECK_TESTS = 'tsc --noEmit --project tests/tsconfig.json';
    const TYPECHECK_WEB = 'tsc --noEmit --project src/commerce-backend-ui-2/web-src/tsconfig.json';

    const scripts: Record<string, string> = {
        lint: 'eslint .',
        'lint:fix': 'eslint . --fix',
        'check-types:app': TYPECHECK_APP,
        'check-types:actions': TYPECHECK_ACTIONS,
        'check-types:tests': TYPECHECK_TESTS,
        test: 'vitest run --passWithNoTests',
    };

    const checkTypeSteps: string[] = [TYPECHECK_APP, TYPECHECK_ACTIONS];

    if (options.hasAdminUI) {
        scripts['check-types:web'] = TYPECHECK_WEB;
        checkTypeSteps.push(TYPECHECK_WEB);
        scripts['generate:action-registry'] = 'node scripts/generate-action-registry.mjs';
    }

    checkTypeSteps.push(TYPECHECK_TESTS);
    scripts['check-types'] = checkTypeSteps.join(' && ');

    if (usesCommerceLib) {
        // Regenerates `.generated/` (extension actions, app manifest, config
        // schema) straight after install, so a fresh clone is buildable and
        // type-checkable without waiting for the first `aio app deploy`.
        //
        // `aio-commerce-lib-app init` writes this script itself, but nothing else
        // in the lib does — and this generator scaffolds `app.commerce.config.ts`
        // and friends directly rather than going through `init`, so it has to be
        // declared here. The `.env` guard matches both reference apps: without a
        // selected workspace (CI, a fresh clone) there is nothing to generate
        // against, and an unguarded hook would fail every `npm install`.
        scripts['postinstall'] =
            '[ -f .env ] && npx aio-commerce-lib-app hooks postinstall || true';
    }

    const major = options.nodeVersion.split('.')[0];

    const json = {
        name: options.packageName,
        version: '0.0.1',
        description: options.description,
        private: true,
        // ESM. `@adobe/aio-commerce-lib-app` emits ESM into each extension's
        // `.generated/` (including JSON import attributes), which fails to parse
        // under `"type": "commonjs"`. Custom install-step scripts must be ESM too.
        type: 'module' as const,
        scripts: orderScripts(scripts),
        ...(options.hasAdminUI ? adminUiWebPackageFields() : {}),
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

/**
 * package.json fields the admin UI's `web-src` needs, mirroring what
 * `@adobe/aio-commerce-lib-app` writes when it scaffolds `web-src` itself. We
 * ship our own scaffold (so the lib doesn't overwrite our tsconfig), which means
 * the lib never reaches the code that adds these — see ADMIN_UI_DEPS above.
 *
 * - `imports['#web/*']` is the subpath alias the web source imports through. It
 *   also drives TypeScript resolution, which is why the web tsconfig sets
 *   `moduleResolution: Bundler` and carries no `paths` mapping. (The lib adds
 *   `#app.commerce.config` to the same map on every build.)
 * - The Parcel entries are required by Spectrum S2: its styles have to be hoisted
 *   into one shared bundle, and `packageExports` lets Parcel honour the `exports`
 *   maps that S2 and the Adobe libs publish.
 */
function adminUiWebPackageFields() {
    return {
        imports: {
            '#web/*': './src/commerce-backend-ui-2/web-src/src/*',
        },
        '@parcel/bundler-default': {
            manualSharedBundles: [
                {
                    name: 's2-styles',
                    assets: [
                        '**/@react-spectrum/s2/**',
                        'src/commerce-backend-ui-2/web-src/*.{js,jsx,ts,tsx}',
                    ],
                    types: ['css'],
                },
            ],
        },
        '@parcel/resolver-default': {
            packageExports: true,
        },
    };
}

function sortObject(obj: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

function orderScripts(scripts: Record<string, string>): Record<string, string> {
    const order = [
        'lint',
        'lint:fix',
        'check-types',
        'check-types:app',
        'check-types:actions',
        'check-types:web',
        'check-types:tests',
        'test',
        'generate:action-registry',
        'postinstall',
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
