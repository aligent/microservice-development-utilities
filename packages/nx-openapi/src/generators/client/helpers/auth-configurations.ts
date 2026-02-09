import { Tree } from '@nx/devkit';
import { IndentationText, Project, QuoteKind, Scope } from 'ts-morph';

interface MiddlewareConfig {
    properties: string;
}

interface AuthMethodConfig {
    middlewareName: string;
    extraImports: string[];
    classProperty: string | null;
    constructorParam: string | null;
    middlewareConfig: MiddlewareConfig;
}

export const AUTH_CONFIGS: Record<string, AuthMethodConfig> = {
    'api-key': {
        middlewareName: 'apiKeyAuthMiddleware',
        extraImports: ['fetchSsmParams'],
        classProperty: 'private credential: string | null = null;',
        constructorParam: 'credentialPath: string',
        middlewareConfig: {
            properties: `header: 'X-Api-Key',
                value: async () => {
                    if (!this.credential) {
                        const param = await fetchSsmParams(credentialPath);
                        if (!param?.Value) {
                            throw new Error('Unable to fetch API client credential');
                        }

                        this.credential = param.Value;
                    }

                    return this.credential;
                },`,
        },
    },
    'oauth1.0a': {
        middlewareName: 'oAuth10aAuthMiddleware',
        extraImports: [],
        classProperty: null,
        constructorParam: null,
        middlewareConfig: {
            properties: `algorithm: 'HMAC-SHA256',
                credentials: async () => ({
                    // TODO: Provide your OAuth 1.0a credentials
                    consumerKey: 'your-consumer-key',
                    consumerSecret: 'your-consumer-secret',
                    token: 'your-token',
                    tokenSecret: 'your-token-secret',
                }),`,
        },
    },
    basic: {
        middlewareName: 'basicAuthMiddleware',
        extraImports: [],
        classProperty: null,
        constructorParam: null,
        middlewareConfig: {
            properties: `credentials: async () => ({
                    // TODO: Provide your basic auth credentials
                    username: 'your-username',
                    password: 'your-password',
                }),`,
        },
    },
    'oauth2.0': {
        middlewareName: 'oAuth20AuthMiddleware',
        extraImports: [],
        classProperty: null,
        constructorParam: null,
        middlewareConfig: {
            properties: `token: async () => {
                    // TODO: Send API call to get your OAuth 2.0 access token
                    return 'your-access-token';
                }`,
        },
    },
} as const;

/**
 * Applies auth method configuration to a generated client file using ts-morph.
 * This modifies the file in the Nx Tree to add auth-specific imports, properties,
 * constructor parameters, and middleware configuration.
 *
 * @param tree - The Nx virtual file system tree
 * @param filePath - Path to the client.ts file in the tree
 * @param authMethod - The auth method to apply
 * @param className - The name of the client class
 */
export function applyAuthMethodConfiguration(
    tree: Tree,
    filePath: string,
    authMethod: string,
    className: string
): void {
    const config = AUTH_CONFIGS[authMethod];

    if (!config) {
        throw new Error(`Unknown auth method: ${authMethod}`);
    }

    const fileContent = tree.read(filePath, 'utf-8');

    if (!fileContent) {
        throw new Error(`Unable to read file: ${filePath}`);
    }

    const project = new Project({
        useInMemoryFileSystem: true,
        manipulationSettings: {
            indentationText: IndentationText.FourSpaces,
            quoteKind: QuoteKind.Single,
        },
    });

    const sourceFile = project.createSourceFile(filePath, fileContent);

    // Add imports to the @aligent/microservice-util-lib import declaration
    const utilLibImport = sourceFile.getImportDeclaration(
        decl => decl.getModuleSpecifierValue() === '@aligent/microservice-util-lib'
    );

    if (utilLibImport) {
        for (const importName of config.extraImports) {
            utilLibImport.addNamedImport(importName);
        }
        utilLibImport.addNamedImport(config.middlewareName);
    }

    // Get the client class
    const clientClass = sourceFile.getClass(className);
    if (!clientClass) {
        throw new Error(`Unable to find class: ${className}`);
    }

    // Add class property if configured (insert before the 'client' property)
    if (config.classProperty) {
        const clientProperty = clientClass.getProperty('client');
        if (clientProperty) {
            const propertyIndex = clientProperty.getChildIndex();
            clientClass.insertProperty(propertyIndex, {
                name: 'credential',
                type: 'string | null',
                initializer: 'null',
                scope: Scope.Private,
            });
        }
    }

    // Modify constructor to add parameter and middleware
    const constructor = clientClass.getConstructors()[0];
    if (!constructor) {
        throw new Error(`Unable to find constructor in class: ${className}`);
    }

    // Add constructor parameter if configured
    if (config.constructorParam) {
        const parts = config.constructorParam.split(':');
        const paramName = parts[0]?.trim() ?? '';
        const paramType = parts[1]?.trim() ?? '';
        constructor.addParameter({
            name: paramName,
            type: paramType,
        });
    }

    // Build the middleware call
    const middlewareCall = `this.client.use(
            ${config.middlewareName}({
                ${config.middlewareConfig.properties}
            })
        );`;

    // Find the retryMiddleware use statement and insert before it
    const statements = constructor.getStatements();
    const retryStatementIndex = statements.findIndex(statement =>
        /this\.client\.use\(\s*retryMiddleware/.test(statement.getText())
    );

    if (retryStatementIndex !== -1) {
        constructor.insertStatements(retryStatementIndex, middlewareCall);
    }

    // Write the modified content back to the tree
    tree.write(filePath, sourceFile.getFullText());
}
