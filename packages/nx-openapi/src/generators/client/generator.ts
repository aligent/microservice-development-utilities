import { Tree, formatFiles, generateFiles, joinPathFragments, logger } from '@nx/devkit';
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
import { ClientGeneratorSchema } from './schema';

const VALID_EXTENSIONS = ['yaml', 'yml', 'json'];

// We also use this as the project root for all generated clients
const PROJECT_NAME = 'clients';

export async function clientGenerator(tree: Tree, options: ClientGeneratorSchema) {
    const { name, schemaPath, importPath = `@clients`, skipValidate, override } = options;

    const ext = schemaPath.split('.').pop() || '';
    if (!VALID_EXTENSIONS.includes(ext)) {
        throw new Error(`Invalid schema file extension: ${ext}`);
    }

    const hasError = await validateSchema(schemaPath);
    if (!skipValidate && hasError) {
        throw new Error('Schema validation failed!');
    }

    const projectRoot = PROJECT_NAME;
    const apiClientDest = `${projectRoot}/src/${name}`;
    const schemaDest = `${apiClientDest}/schema.${ext}`;
    const typesDest = `${apiClientDest}/generated-types.ts`;

    if (!override && tree.exists(apiClientDest)) {
        throw new Error(
            `Directory "${name}" already exists. If you want to override the current api client in this directory use "--override"`
        );
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

    /**
     * Each time we add new API client, we actually add a new class into `clients` project (if it exists).
     * This add a new example client class to `apiClientDest` folder
     */
    generateFiles(tree, joinPathFragments(__dirname, './client-specific-files'), apiClientDest, {
        className: toClassName(name),
    });

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
