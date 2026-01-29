import nxEslintPlugin from '@nx/eslint-plugin';
import jsonParser from 'jsonc-eslint-parser';
import baseConfig from '../../eslint.config.mjs';

export default [
    ...baseConfig,
    {
        files: ['./package.json'],
        plugins: { '@nx': nxEslintPlugin },
        rules: {
            '@nx/dependency-checks': ['error', { ignoredFiles: ['{projectRoot}/*.{js,cjs,mjs}'] }],
        },
        languageOptions: { parser: jsonParser },
    },
];
