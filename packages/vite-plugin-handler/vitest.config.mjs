import { defineConfig, mergeConfig } from 'vitest/config';
import { vitestBaseConfig } from '../../vitest.config.base.mjs';

export default mergeConfig(
    vitestBaseConfig,
    defineConfig({
        cacheDir: '../../node_modules/.vitest/vite-plugin-handler',
        test: {
            env: {
                // Override VITEST so the handler-bundle plugin's config hook
                // doesn't skip environment creation during tests.
                // The specific test for VITEST behaviour stubs it back.
                VITEST: '',
            },
            unstubEnvs: true,
        },
    })
);
