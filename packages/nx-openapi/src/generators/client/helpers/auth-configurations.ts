import { Tree } from '@nx/devkit';
import { IndentationText, Project, QuoteKind, SyntaxKind } from 'ts-morph';

interface AuthMethodConfig {
    middlewareName: string;
    helperFunction?: {
        name: string;
        body: string;
    };
    middlewareConfig: {
        properties: string;
    };
}

export const AUTH_CONFIGS: Record<string, AuthMethodConfig> = {
    'api-key': {
        middlewareName: 'apiKeyAuthMiddleware',
        middlewareConfig: {
            properties: `header: 'X-Api-Key', value: 'your-api-key'`,
        },
    },
    'oauth1.0a': {
        middlewareName: 'oAuth10aAuthMiddleware',
        middlewareConfig: {
            properties: `algorithm: 'HMAC-SHA256', credentials: { consumerKey: 'your-consumer-key', consumerSecret: 'your-consumer-secret', token: 'your-token', tokenSecret: 'your-token-secret' }`,
        },
    },
    basic: {
        middlewareName: 'basicAuthMiddleware',
        middlewareConfig: {
            properties: `credentials: { username: 'your-username', password: 'your-password' }`,
        },
    },
    'oauth2.0': {
        middlewareName: 'oAuth20AuthMiddleware',
        helperFunction: {
            name: 'fetchAccessToken',
            body: `// TODO: Send API call to get your OAuth 2.0 access token
return 'your-access-token';`,
        },
        middlewareConfig: {
            properties: `token: async () => fetchAccessToken(),`,
        },
    },
} as const;

/**
 * Applies auth method configuration to a generated client file using ts-morph.
 * This modifies the file in the Nx Tree to add the auth middleware import, an
 * optional top-level credential/token helper function, and middleware registration.
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

    let clientClass = sourceFile.getClass(className);
    if (!clientClass) {
        throw new Error(`Unable to find class: ${className}`);
    }

    // Add imports to the @aligent/microservice-util-lib import declaration
    const utilLibImport = sourceFile.getImportDeclaration(
        decl => decl.getModuleSpecifierValue() === '@aligent/microservice-util-lib'
    );

    if (utilLibImport) {
        utilLibImport.addNamedImport(config.middlewareName);
    }

    if (config.helperFunction) {
        sourceFile.insertFunction(clientClass.getChildIndex(), {
            isAsync: true,
            name: config.helperFunction.name,
            statements: config.helperFunction.body,
        });

        // Inserting a sibling statement forgets existing node
        // references, so the class needs to be re-fetched.
        clientClass = sourceFile.getClass(className);
        if (!clientClass) {
            throw new Error(`Unable to find class: ${className}`);
        }
    }

    const constructor = clientClass.getConstructors()[0];
    if (!constructor) {
        throw new Error(`Unable to find constructor in class: ${className}`);
    }

    const statements = constructor.getStatements();
    const useStatement = statements.find(statement =>
        /this\.client\.use\(/.test(statement.getText())
    );

    if (!useStatement) {
        throw new Error(`Unable to find a this.client.use(...) statement in class: ${className}`);
    }

    const useCallExpression = useStatement
        .getDescendantsOfKind(SyntaxKind.CallExpression)
        .find(call => /this\.client\.use$/.test(call.getExpression().getText()));

    if (!useCallExpression) {
        throw new Error(`Unable to find a this.client.use(...) statement in class: ${className}`);
    }

    // Add the auth middleware as an argument of the existing use() call, right
    // after throwOnNotOk() so it still runs before logMiddleware() observes the
    // response.
    const existingArgs = useCallExpression.getArguments();
    const throwOnNotOkIndex = existingArgs.findIndex(arg => /throwOnNotOk\(/.test(arg.getText()));
    const insertIndex = throwOnNotOkIndex === -1 ? 0 : throwOnNotOkIndex + 1;

    const middlewareArgument = `${config.middlewareName}({${config.middlewareConfig.properties}})`;

    useCallExpression.insertArgument(insertIndex, middlewareArgument);

    sourceFile.formatText();

    tree.write(filePath, sourceFile.getFullText());
}
