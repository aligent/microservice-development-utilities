import { withNx } from '@nx/rollup/with-nx.js';

const baseOptions = {
    main: './src/index.ts',
    // Test-only scaffolding, published as the `./testing` subpath so it stays
    // unreachable from the main entry a consumer bundles into a Lambda.
    additionalEntryPoints: ['./src/testing/testing.ts'],
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
