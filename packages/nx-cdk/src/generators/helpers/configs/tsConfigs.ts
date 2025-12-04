interface TsConfig {
    extends: string;
    compilerOptions?: Record<string, unknown>;
    files?: string[];
    include: string[];
    exclude?: string[];
    references: Array<Record<string, string>>;
}

const BASE_CONFIG = '@aligent/ts-code-standards/tsconfigs-extend';

export const TS_CONFIG_JSON: TsConfig = {
    extends: BASE_CONFIG,
    files: [],
    include: [],
    references: [],
} as const;

export const TS_CONFIG_LIB_JSON: TsConfig = {
    extends: BASE_CONFIG,
    compilerOptions: {
        baseUrl: '.',
        rootDir: 'src',
        outDir: 'dist',
        tsBuildInfoFile: 'dist/tsconfig.lib.tsbuildinfo',
        types: ['node'],
    },
    include: ['src/**/*.ts'],
    exclude: ['vite.config.mjs', 'src/**/*.spec.ts', 'src/**/*.test.ts'],
    references: [],
} as const;

export const TS_CONFIG_SPEC_JSON: TsConfig = {
    extends: BASE_CONFIG,
    compilerOptions: {
        outDir: './out-tsc/vitest',
        types: ['vitest/globals', 'vitest/importMeta', 'vite/client', 'node', 'vitest'],
    },
    include: [
        'vite.config.mjs',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'tests/**/*.test.ts',
        'tests/**/*.spec.ts',
        'tests/**/*.d.ts',
    ],
    references: [{ path: './tsconfig.lib.json' }],
};
