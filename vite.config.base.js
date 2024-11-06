/// <reference types="vitest" />
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';

export const viteBaseConfig = defineConfig({
    plugins: [
        viteTsConfigPaths({
            root: '../../',
        }),
    ],

    test: {
        globals: true,
        environment: 'node',
        passWithNoTests: true,
        coverage: {
            reporter: ['text', 'html'],
            exclude: ['node_modules/', '**/types', '*.mjs'],
            all: true,
            thresholds: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80,
            },
        },
        include: [
            'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        ],
    },
});
