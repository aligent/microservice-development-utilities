import type { Tree } from '@nx/devkit';
import type { AppGeneratorSchema, NormalizedSchema, SidebarCategory } from '../schema';

const KEBAB = /^[a-z][a-z0-9-]*$/;
const SEMVER = /^v?(\d+\.\d+\.\d+)\s*$/m;
const DEFAULT_NODE_VERSION = '24.0.1';

const SIDEBAR_TITLES: Record<Exclude<SidebarCategory, 'none'>, string> = {
    catalog: 'Catalog Apps',
    sales: 'Sales Apps',
    customers: 'Customer Apps',
    content: 'Content Apps',
};

export function normalizeOptions(tree: Tree, options: AppGeneratorSchema): NormalizedSchema {
    if (!KEBAB.test(options.name)) {
        throw new Error(
            `App name "${options.name}" must be kebab-case (lowercase letters, digits, hyphens).`
        );
    }
    if (tree.exists(options.name)) {
        throw new Error(`Path "${options.name}" already exists in the workspace.`);
    }

    const hasAdminUI = options.hasAdminUI ?? false;
    const hasBusinessConfig = options.hasBusinessConfig ?? false;
    const sidebarCategory: SidebarCategory = hasAdminUI
        ? (options.sidebarCategory ?? 'none')
        : 'none';

    const displayName = options.displayName ?? toTitleCase(options.name);
    const camel = toCamelCase(options.name);

    return {
        name: options.name,
        description: options.description ?? '',
        displayName,
        hasAdminUI,
        sidebarCategory,
        hasBusinessConfig,
        hasCommerceWebhooks: options.hasCommerceWebhooks ?? false,
        hasEvents: options.hasEvents ?? false,
        hasRestActions: options.hasRestActions ?? false,
        hasScheduledActions: options.hasScheduledActions ?? false,
        hasCustomInstallSteps: options.hasCustomInstallSteps ?? false,
        appRoot: options.name,
        packageName: `@aligent/${options.name}`,
        runtimePackageName: camel,
        appSlug: options.name.replace(/-/g, '_'),
        extensionId: `${camel}Extension`,
        sidebarCategoryTitle: sidebarCategory === 'none' ? '' : SIDEBAR_TITLES[sidebarCategory],
        nodeVersion: readNodeVersion(tree),
    };
}

/**
 * Reads the workspace's `.nvmrc` and extracts the Node version. Falls back to
 * a sensible default if the file is missing or doesn't contain a parseable
 * semver — keeping the .nvmrc as the single source of truth without making
 * the app generator brittle to non-AppBuilder workspaces.
 */
function readNodeVersion(tree: Tree): string {
    const raw = tree.read('.nvmrc', 'utf-8');
    if (raw === null) return DEFAULT_NODE_VERSION;
    const match = SEMVER.exec(raw);
    return match?.[1] ?? DEFAULT_NODE_VERSION;
}

function toCamelCase(input: string): string {
    return input.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function toTitleCase(input: string): string {
    return input
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
