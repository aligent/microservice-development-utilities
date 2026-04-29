export type SidebarCategory = 'catalog' | 'sales' | 'customers' | 'content' | 'none';

export interface AppGeneratorSchema {
    name: string;
    description?: string;
    displayName?: string;
    hasAdminUI?: boolean;
    sidebarCategory?: SidebarCategory;
    hasBusinessConfig?: boolean;
    hasCommerceWebhooks?: boolean;
    hasEvents?: boolean;
    hasRestActions?: boolean;
    hasScheduledActions?: boolean;
    hasCustomInstallSteps?: boolean;
}

export interface NormalizedSchema extends Required<AppGeneratorSchema> {
    /** Path of the generated app relative to the workspace root, e.g. "my-app" */
    appRoot: string;
    /** Scoped npm package name, e.g. "@aligent/my-app" */
    packageName: string;
    /** lower-camel-case identifier for runtime manifest packages */
    runtimePackageName: string;
    /** snake_case slug used inside the registration menu item id (e.g. "my_app") */
    appSlug: string;
    /** camelCase identifier with "Extension" suffix used as the EXTENSION_ID constant */
    extensionId: string;
    /** Title-cased section title for the sidebar (e.g. "Content Apps") */
    sidebarCategoryTitle: string;
}
