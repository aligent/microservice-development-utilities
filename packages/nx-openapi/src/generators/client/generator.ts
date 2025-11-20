import { Tree, formatFiles, generateFiles, joinPathFragments, logger } from '@nx/devkit';
import {
    copySchema,
    generateOpenApiTypes,
    validateSchema,
} from '../../helpers/generate-openapi-types';
import { addTsConfigPath, attemptToAddProjectConfiguration, appendtoIndexFile } from '../../helpers/utilities';
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
    const typesDest = `${apiClientDest}/types.ts`;

    const isNewProject = attemptToAddProjectConfiguration(tree, projectRoot);

    await copySchema(tree, schemaDest, schemaPath);
    await generateOpenApiTypes(tree, schemaDest, typesDest);

    if (isNewProject) {
        logger.info('No clients currently exist. Generating a clients folder...')
        logger.info(`Creating new project at ${projectRoot}`);

        // Generate other files
        generateFiles(tree, joinPathFragments(__dirname, './files'), projectRoot, options);

        // Add the project to the tsconfig paths so it can be imported by namespace
        addTsConfigPath(tree, importPath, [joinPathFragments(projectRoot, './src', 'index.ts')]);
    }

    // Generate the files for the specific new client
    generateFiles(tree, joinPathFragments(__dirname, './client-specific-files'), apiClientDest, options)

    // Append to index file for imports
    appendtoIndexFile(tree, projectRoot, name)

    await formatFiles(tree);
}

export default clientGenerator;
