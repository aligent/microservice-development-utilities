import { defineConfig, mergeConfig } from 'vitest/config';
import { vitestBaseConfig } from '../../vitest.config.base.mjs';

export default mergeConfig(
    vitestBaseConfig,
    defineConfig({
        cacheDir: '../../node_modules/.vitest/appbuilder-util-lib',
    })
);
