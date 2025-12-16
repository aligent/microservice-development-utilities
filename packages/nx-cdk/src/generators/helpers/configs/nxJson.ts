import { NxJsonConfiguration } from '@nx/devkit';

export const NX_JSON: NxJsonConfiguration & { $schema: string } = {
    $schema: './node_modules/nx/schemas/nx-schema.json',
    defaultBase: 'origin/staging',
    plugins: [
        { plugin: '@nx/eslint/plugin', options: {} },
        { plugin: '@nx/vite/plugin', options: {} },
        { plugin: '@nx/js/typescript', options: { build: false } },
    ],
    namedInputs: {
        default: ['{projectRoot}/**/*', 'sharedGlobals'],
        production: [
            'default',
            '!{projectRoot}/.eslintrc.json',
            '!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)',
            '!{projectRoot}/tsconfig.spec.json',
            '!{projectRoot}/vitest.config.m[jt]s',
            '!{projectRoot}/src/test-setup.[jt]s',
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
        cdk: { dependsOn: ['^build', '^build:lambda'], inputs: ['production', '^production'] },
        lint: { cache: true, inputs: ['default'] },
        test: {
            cache: true,
            inputs: ['default', '^production'],
            outputs: ['{projectRoot}/coverage'],
            // Stack tests may require lambda handlers to be built first
            dependsOn: ['^build', 'build:lambda'],
            configurations: { coverage: { coverage: true } },
        },
        typecheck: { cache: true, dependsOn: ['^build'], inputs: ['production', '^production'] },
        parameters: {
            executor: 'nx:run-commands',
            options: { color: true, cwd: '{projectRoot}/parameters', file: '.env.csv' },
            defaultConfiguration: 'export',
            configurations: {
                import: { command: 'store-parameters import {args.file}' },
                export: { command: 'store-parameters export {args.file} --path={args.path}' },
            },
        },
    },
} as const;
