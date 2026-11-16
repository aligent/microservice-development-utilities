import nxEslintPlugin from '@nx/eslint-plugin';
import { parseForESLint } from 'jsonc-eslint-parser';
import baseConfig from '../../eslint.config.mjs';

export default [
    ...baseConfig,
    {
        files: ['src/global-types/**/*.d.ts'],
        rules: {
            'import/no-extraneous-dependencies': 'off',
        },
    },
    {
        files: ['./package.json'],
        plugins: { '@nx': nxEslintPlugin },
        rules: {
            '@nx/dependency-checks': ['error', { ignoredFiles: ['{projectRoot}/*.{js,cjs,mjs}'] }],
        },
        languageOptions: { parser: { parseForESLint } },
    },
];
