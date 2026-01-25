import { NxJsonConfiguration } from '@nx/devkit';

export const NX_JSON: NxJsonConfiguration & { $schema: string } = {
    $schema: './node_modules/nx/schemas/nx-schema.json',
    defaultBase: 'origin/staging',
    sync: { applyChanges: true },
    plugins: [
        { plugin: '@nx/eslint/plugin', options: {} },
        { plugin: '@nx/js/typescript', options: { build: false } },
        { plugin: '@nx/vitest', options: {} },
    ],
    namedInputs: {
        default: ['{projectRoot}/**/*', 'sharedGlobals'],
        production: [
            'default',
            '!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)',
            '!{projectRoot}/tests/*',
            '!{projectRoot}/tsconfig.spec.json',
            '!{projectRoot}/vitest.config.m[jt]s',
        ],
        sharedGlobals: [],
    },
    targetDefaults: {
        build: {
            cache: true,
            dependsOn: ['^build'],
            inputs: ['production', '^production'],
            outputs: ['{projectRoot}/dist'],
        },
        lint: { cache: true, inputs: ['default', '^production'] },
        test: {
            cache: true,
            inputs: ['default', '^production'],
            outputs: ['{projectRoot}/coverage'],
            dependsOn: ['^build'], // Stack tests may require lambda handlers to be built first
            configurations: { coverage: { coverage: true } },
        },
        typecheck: { cache: true, inputs: ['default', '^production'] },
    },
} as const;
