import { Tree, formatFiles, generateFiles, joinPathFragments, logger } from '@nx/devkit';
import { prompt } from 'enquirer';
import {
    copySchema,
    generateOpenApiTypes,
    validateSchema,
} from '../../helpers/generate-openapi-types';
import {
    addTsConfigPath,
    addTsConfigReference,
    appendToIndexFile,
    getExistingProject,
    getRootTsConfigPathInTree,
    toClassName,
} from '../../helpers/utilities';
import { applyAuthMethodConfiguration } from './helpers/auth-configurations';
import { ClientGeneratorSchema } from './schema';

const VALID_EXTENSIONS = ['yaml', 'yml', 'json'];

// We also use this as the project root for all generated clients
const PROJECT_NAME = 'clients';

async function promptForAuthMethod(): Promise<string> {
    const answer = await prompt<{ authMethod: string }>({
        type: 'select',
        name: 'authMethod',
        message: 'Which authentication method should the client use?',
        choices: [
            { name: 'api-key', message: 'API Key' },
            { name: 'oauth1.0a', message: 'OAuth 1.0a' },
            { name: 'basic', message: 'Basic Auth' },
            { name: 'oauth2.0', message: 'OAuth 2.0' },
        ],
    });
    return answer.authMethod;
}

export async function clientGenerator(tree: Tree, options: ClientGeneratorSchema) {
    const {
        name,
        schemaPath,
        importPath = `@clients`,
        skipValidate,
        override,
        authMethod,
    } = options;

    const ext = schemaPath.split('.').pop() || '';
    if (!VALID_EXTENSIONS.includes(ext)) {
        throw new Error(`Invalid schema file extension: ${ext}`);
    }

    if (!skipValidate) {
        const hasError = await validateSchema(schemaPath);
        if (hasError) {
            throw new Error('Schema validation failed!');
        }
    }

    const projectRoot = PROJECT_NAME;
    const apiClientDest = `${projectRoot}/src/${name}`;
    const schemaDest = `${apiClientDest}/schema.${ext}`;
    const typesDest = `${apiClientDest}/generated-types.ts`;

    if (tree.exists(apiClientDest) && !override) {
        throw new Error(
            `Directory "${name}" already exists. If you want to override the current api client in this directory use "--override"`
        );
    }

    const isOverriding = override && tree.exists(apiClientDest);
    if (isOverriding) {
        // Remove stale schema files (extension may have changed)
        const schemaChildren = tree
            .children(apiClientDest)
            .filter(child => child.startsWith('schema.'));
        schemaChildren.forEach(schema => {
            tree.delete(`${apiClientDest}/${schema}`);
        });
    }

    const existingProject = getExistingProject(tree, PROJECT_NAME);
    if (!existingProject) {
        logger.warn(`Creating new project ${PROJECT_NAME} at ${projectRoot}`);

        generateFiles(tree, joinPathFragments(__dirname, './files'), projectRoot, options);

        const tsConfigFile = getRootTsConfigPathInTree(tree);

        if (tsConfigFile === 'tsconfig.json') {
            addTsConfigReference(tree, tsConfigFile, `./${projectRoot}`);
        } else {
            const lookupPath = joinPathFragments(projectRoot, './src', 'index.ts');
            addTsConfigPath(tree, tsConfigFile, importPath, [lookupPath]);
        }
    }

    await copySchema(tree, schemaDest, schemaPath);
    await generateOpenApiTypes(tree, schemaDest, typesDest);

    // Only scaffold client.ts and apply auth config on first generation.
    // On override, preserve the user's customized client.ts.
    if (!isOverriding) {
        const resolvedAuthMethod = authMethod ?? (await promptForAuthMethod());

        const className = toClassName(name);
        generateFiles(
            tree,
            joinPathFragments(__dirname, './client-specific-files'),
            apiClientDest,
            { className }
        );

        const clientFilePath = joinPathFragments(apiClientDest, 'client.ts');
        applyAuthMethodConfiguration(tree, clientFilePath, resolvedAuthMethod, className);
    }

    /**
     * The `clients` project expose all the API clients via `src/index.ts` file.
     * As a result, we need to append new client to the list of exporting;
     */
    appendToIndexFile(tree, projectRoot, name);

    await formatFiles(tree);

    logger.info(`Successfully generated ${name} API client`);
    logger.info(
        `Next step: Run "nx affected -t lint" to fix any linting issues that may arise from the generated code.`
    );
}

export default clientGenerator;
