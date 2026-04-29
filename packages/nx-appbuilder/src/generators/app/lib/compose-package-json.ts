import type { Tree } from '@nx/devkit';
import type { NormalizedSchema } from '../schema';

/**
 * Builds the new app's package.json based on selected flags.
 *
 * Versions are pinned to what the existing apps in the monorepo use; bump
 * them in one place (the maps below) when the SDKs move forward.
 */
const BASE_DEPS: Record<string, string> = {
    '@adobe/aio-sdk': '^6.0.0',
    '@adobe/aio-lib-telemetry': '^1.1.3',
};

const COMMERCE_DEPS: Record<string, string> = {
    '@adobe/aio-commerce-lib-app': '^1.2.0',
    '@adobe/aio-commerce-lib-config': '^1.1.0',
};

const ADMIN_UI_DEPS: Record<string, string> = {
    '@adobe/uix-guest': '^1.1.5',
    '@adobe/exc-app': '^1.4.13',
    '@adobe/react-spectrum': '^3.46.1',
    react: '^19.1.0',
    'react-dom': '^19.1.0',
    'react-router': '^7.13.0',
};

const BASE_DEV_DEPS: Record<string, string> = {
    '@aligent/ts-code-standards': '^4.2.0',
    '@babel/preset-env': '^7.26.9',
    '@babel/preset-typescript': '^7.27.0',
    '@types/node': '^22.14.0',
    'babel-loader': '^10.0.0',
    'ts-loader': '^9.5.2',
    'type-fest': '^4.39.1',
    typescript: '^5.8.3',
    vitest: '^2.1.8',
};

const ADMIN_UI_DEV_DEPS: Record<string, string> = {
    '@types/react': '^19.1.0',
    '@types/react-dom': '^19.1.2',
};

export function writePackageJson(tree: Tree, options: NormalizedSchema): void {
    const dependencies: Record<string, string> = { ...BASE_DEPS };
    const devDependencies: Record<string, string> = { ...BASE_DEV_DEPS };

    const usesCommerceLib =
        options.hasAdminUI || options.hasBusinessConfig || options.hasCommerceWebhooks;

    if (usesCommerceLib) {
        Object.assign(dependencies, COMMERCE_DEPS);
    }

    if (options.hasAdminUI) {
        Object.assign(dependencies, ADMIN_UI_DEPS);
        Object.assign(devDependencies, ADMIN_UI_DEV_DEPS);
    }

    const scripts: Record<string, string> = {
        lint: 'eslint .',
        'lint:fix': 'npm run lint -- --fix',
        'check-types:actions': 'tsc --noEmit --project src/actions/tsconfig.json',
        'check-types:tests': 'tsc --noEmit --project tests/tsconfig.json',
        test: 'vitest run --passWithNoTests',
    };

    const checkTypeSteps: string[] = ['npm run check-types:actions'];

    if (options.hasAdminUI) {
        scripts['check-types:web'] =
            'tsc --noEmit --project src/commerce-backend-ui-1/web-src/tsconfig.json';
        checkTypeSteps.push('npm run check-types:web');
    }

    checkTypeSteps.push('npm run check-types:tests');
    scripts['check-types'] = checkTypeSteps.join(' && ');

    const json = {
        name: options.packageName,
        version: '0.0.1',
        description: options.description,
        private: true,
        type: 'commonjs' as const,
        scripts: orderScripts(scripts),
        dependencies: sortObject(dependencies),
        devDependencies: sortObject(devDependencies),
        engines: { node: '>=18' },
        nx: {
            targets: {
                'check-types': {
                    executor: 'nx:run-commands',
                    options: { command: 'npm run check-types', cwd: '{projectRoot}' },
                },
                deploy: {
                    executor: 'nx:run-commands',
                    options: { command: 'aio app deploy', cwd: '{projectRoot}' },
                },
            },
        },
    };

    tree.write(`${options.appRoot}/package.json`, JSON.stringify(json, null, 4) + '\n');
}

function sortObject(obj: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}

function orderScripts(scripts: Record<string, string>): Record<string, string> {
    const order = [
        'lint',
        'lint:fix',
        'check-types',
        'check-types:actions',
        'check-types:web',
        'check-types:tests',
        'test',
    ];
    const ordered: Record<string, string> = {};
    for (const key of order) {
        const value = scripts[key];
        if (value !== undefined) ordered[key] = value;
    }
    for (const [key, value] of Object.entries(scripts)) {
        if (!(key in ordered)) ordered[key] = value;
    }
    return ordered;
}
