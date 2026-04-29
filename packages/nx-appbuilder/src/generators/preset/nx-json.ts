import type { NxJsonConfiguration } from '@nx/devkit';

export const NX_JSON: NxJsonConfiguration & { $schema: string } = {
    $schema: './node_modules/nx/schemas/nx-schema.json',
    defaultBase: 'origin/main',
    installation: {
        version: '22.4.5',
    },
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
