import { Tree, formatFiles, generateFiles, joinPathFragments, logger } from '@nx/devkit';
import {
    copySchema,
    generateOpenApiTypes,
    validateSchema,
} from '../../helpers/generate-openapi-types';
import {
    addTsConfigPath,
    appendToIndexFile,
    attemptToAddProjectConfiguration,
    toClassName,
} from '../../helpers/utilities';
import { ClientGeneratorSchema } from './schema';

const VALID_EXTENSIONS = ['yaml', 'yml', 'json'];

export async function clientGenerator(tree: Tree, options: ClientGeneratorSchema) {
    const { name, schemaPath, importPath = `@clients`, skipValidate, override } = options;

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

    const projectRoot = `clients`;
    const apiClientDest = `${projectRoot}/src/${name}`;
    const schemaDest = `${apiClientDest}/schema.${ext}`;
    const typesDest = `${apiClientDest}/generated-types.ts`;

    if (!override && tree.exists(apiClientDest)) {
        throw new Error(
            `Directory "${name}" already exists. If you want to override the current api client in this directory use "--override"`
        );
    }

    const isNewProject = attemptToAddProjectConfiguration(tree, projectRoot);

    await copySchema(tree, schemaDest, schemaPath);
    await generateOpenApiTypes(tree, schemaDest, typesDest);

    if (isNewProject) {
        logger.info(`Creating new project at ${projectRoot}`);

        generateFiles(tree, joinPathFragments(__dirname, './files'), projectRoot, options);
        addTsConfigPath(tree, importPath, [joinPathFragments(projectRoot, './src', 'index.ts')]);
    }

    // Generate the files for the specific new client
    generateFiles(tree, joinPathFragments(__dirname, './client-specific-files'), apiClientDest, {
        className: toClassName(name),
    });

    // Append to index file for imports
    appendToIndexFile(tree, projectRoot, name);

    await formatFiles(tree);

    logger.info(`Successfully generated ${name} API client`);
    logger.info(
        `Next step: Run "nx affected -t lint" to fix any linting issues that may arise from the generated code.`
    );
}

export default clientGenerator;
