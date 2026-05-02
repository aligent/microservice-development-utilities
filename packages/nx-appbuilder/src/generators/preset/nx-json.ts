import type { NxJsonConfiguration } from '@nx/devkit';

export const NX_JSON: NxJsonConfiguration & { $schema: string } = {
    $schema: './node_modules/nx/schemas/nx-schema.json',
    defaultBase: 'origin/main',
    installation: {
        version: '22.4.5',
    },
    plugins: [
        { plugin: '@nx/eslint/plugin', options: {} },
        // App Builder apps drive their own multi-tsconfig type-checking via a
        // `check-types` script (one tsc invocation per actions/web/tests
        // subtree). The plugin's inferred `typecheck` target only runs against
        // a single root tsconfig, so it's disabled here to avoid surfacing a
        // useless target alongside our custom one.
        { plugin: '@nx/js/typescript', options: { build: false, typecheck: false } },
        { plugin: '@nx/vitest', options: {} },
    ],
    namedInputs: {
        default: ['{projectRoot}/**/*', 'sharedGlobals'],
        sharedGlobals: [],
        production: [
            'default',
            '!{projectRoot}/**/*.spec.ts',
            '!{projectRoot}/**/*.test.ts',
            '!{projectRoot}/tests/**/*',
        ],
    },
    targetDefaults: {
        lint: { inputs: ['default'], cache: true },
        'check-types': { inputs: ['default'], cache: true },
        test: { inputs: ['default'], cache: true },
        build: { inputs: ['production'], cache: true, dependsOn: ['^build'] },
    },
};
