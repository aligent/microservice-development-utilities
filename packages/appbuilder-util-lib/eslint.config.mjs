import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import baseConfig from '../../eslint.config.mjs';

const compat = new FlatCompat({
    baseDirectory: import.meta.dirname,
    recommendedConfig: js.configs.recommended,
});

export default [
    ...baseConfig,
    ...compat
        .config({
            extends: ['plugin:@nx/typescript'],
        })
        .map(config => ({
            ...config,
            files: ['**/*.ts', '**/*.tsx'],
            rules: {},
        })),
    {
        files: ['src/global-types/**/*.d.ts'],
        rules: {
            'import/no-extraneous-dependencies': 'off',
        },
    },
];
