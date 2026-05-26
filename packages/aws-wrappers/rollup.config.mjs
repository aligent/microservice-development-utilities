import { withNx } from '@nx/rollup/with-nx.js';

const baseOptions = {
    main: './src/index.ts',
    tsConfig: './tsconfig.lib.json',
    compiler: 'tsc',
    assets: [],
};

export default [
    withNx(
        { ...baseOptions, outputPath: './dist/esm', format: ['esm'] },
        { output: { entryFileNames: '[name].mjs', chunkFileNames: '[name].mjs' } }
    ),
    withNx(
        { ...baseOptions, outputPath: './dist/cjs', format: ['cjs'] },
        { output: { entryFileNames: '[name].cjs', chunkFileNames: '[name].cjs' } }
    ),
];
