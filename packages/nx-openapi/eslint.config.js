const baseConfig = require('../../eslint.config.js');
const jsonParser = require('jsonc-eslint-parser');
const nxEslintPlugin = require('@nx/eslint-plugin');

module.exports = [
    ...baseConfig,
    {
        files: ['./package.json'],
        plugins: { '@nx': nxEslintPlugin },
        rules: {
            '@nx/dependency-checks': ['error', { ignoredFiles: ['{projectRoot}/*.{js,cjs,mjs}'] }],
        },
        languageOptions: { parser: jsonParser },
    },
    {
        files: ['./package.json', './generators.json'],
        plugins: { '@nx': nxEslintPlugin },
        rules: { '@nx/nx-plugin-checks': 'error' },
        languageOptions: { parser: jsonParser },
    },
];
