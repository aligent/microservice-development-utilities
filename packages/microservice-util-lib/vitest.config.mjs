import { defineConfig, mergeConfig } from 'vitest/config';
import { viteBaseConfig } from '../../vitest.config.base.mjs';

export default mergeConfig(
    viteBaseConfig,
    defineConfig({
        cacheDir: '../../node_modules/.vitest/microservice-util-lib',
    })
);
