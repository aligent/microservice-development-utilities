import { defineConfig, mergeConfig } from 'vitest/config';
import { viteBaseConfig } from '../../vite.config.base.js';

export default mergeConfig(
    viteBaseConfig,
    defineConfig({
        cacheDir: '../../node_modules/.vite/microservice-util-lib',
    })
);
