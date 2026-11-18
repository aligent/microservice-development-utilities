/**
 * Commerce Admin parent-menu IDs accepted by `adminUi.menu.parentMenu`, plus
 * `none` for a top-level menu item (the key is omitted entirely).
 */
export type ParentMenu =
    | 'sales'
    | 'catalog'
    | 'customers'
    | 'marketing'
    | 'content'
    | 'reports'
    | 'stores'
    | 'system'
    | 'none';

export interface AppGeneratorSchema {
    name: string;
    description?: string;
    displayName?: string;
    hasAdminUI?: boolean;
    parentMenu?: ParentMenu;
    hasBusinessConfig?: boolean;
    hasCommerceWebhooks?: boolean;
    hasEvents?: boolean;
    hasRestActions?: boolean;
    hasScheduledActions?: boolean;
    hasCustomInstallSteps?: boolean;
}

export interface NormalizedSchema extends Required<AppGeneratorSchema> {
    /**
     * Whether the app integrates with Adobe Commerce via `@adobe/aio-commerce-lib-app`
     * (app.commerce.config.ts, the `commerce/extensibility/1` extension, the lib's
     * dependencies and hooks). True for any of the commerce flags, and for
     * custom install steps, which only exist inside that lib's install flow.
     */
    usesCommerceLib: boolean;
    /** Path of the generated app relative to the workspace root, e.g. "my-app" */
    appRoot: string;
    /** Scoped npm package name, e.g. "@aligent/my-app" */
    packageName: string;
    /** lower-camel-case identifier for runtime manifest packages */
    runtimePackageName: string;
    /** snake_case slug used as `adminUi.menu.id` (e.g. "my_app") — hyphens are rejected there */
    appSlug: string;
    /** Full Node.js version read from the workspace's .nvmrc, e.g. "24.0.1" */
    nodeVersion: string;
}
