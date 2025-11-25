import { logger, Tree } from '@nx/devkit';
import { lint, loadConfig } from '@redocly/openapi-core';
import { readFileSync } from 'fs';
import openapiTS, { astToString } from 'openapi-typescript';

/**
 * Generates TypeScript types from an OpenAPI schema
 * and writes the generated types to a specified destination.
 *
 * @param {Tree} tree - The file system tree representing the current project.
 * @param {string} schemaPath - The path to the OpenAPI schema file.
 * @param {string} typeDest - The destination path for the generated TypeScript types.
 * @returns {Promise<void>} A promise that resolves when the types are successfully generated.
 * @throws {Error} If the schema cannot be read or the types cannot be generated.
 */
export async function generateOpenApiTypes(
    tree: Tree,
    schemaPath: string,
    typeDest: string
): Promise<void> {
    logger.info(`Generating types from ${schemaPath}`);
    const schema = tree.read(schemaPath);

    if (!schema) {
        throw new Error(`Failed to read schema at ${schemaPath}`);
    }

    const ast = await openapiTS(schema);

    tree.write(typeDest, astToString(ast));
}

// We do not want to test this function.
// It only downloads/copies the schema to a specified destination.
/* v8 ignore start */
/**
 * Copies the OpenAPI schema from the source to a specified destination.
 *
 * This function supports both local and remote schemas. If the schema is remote (HTTP/HTTPS),
 * it fetches the schema from the URL. If the schema is local, it reads the schema from the file system.
 *
 * @param {Tree} tree - The file system tree representing the current project.
 * @param {string} destination - The destination path where the schema will be copied.
 * @param {string} schemaPath - The path to the schema file (local or remote).
 * @returns {Promise<void>} A promise that resolves when the schema is successfully copied.
 * @throws {Error} If the schema cannot be read or is empty.
 */
export async function copySchema(
    tree: Tree,
    destination: string,
    schemaPath: string
): Promise<void> {
    const isRemoteSchema = schemaPath.startsWith('http://') || schemaPath.startsWith('https://');

    let schema: Buffer | null;

    // TODO: MI-203 - Support private schema endpoint
    if (isRemoteSchema) {
        const response = await fetch(schemaPath);
        schema = Buffer.from(await response.arrayBuffer());
    } else {
        schema = readFileSync(schemaPath);
    }

    if (!schema || !schema.length) {
        throw new Error(`Failed to read schema at ${schemaPath}`);
    }

    tree.write(destination, schema);
}
/* v8 ignore end */

/**
 * Validates an OpenAPI schema using the Redocly OpenAPI linter.
 *
 * This function uses the `@redocly/openapi-core` library to lint the schema at the specified path.
 * It logs warnings and errors based on the severity of the issues found in the schema.
 *
 * @param {string} path - The path to the OpenAPI schema file.
 * @returns {Promise<boolean>} A promise that resolves to `true` if validation errors are found, otherwise `false`.
 */
export async function validateSchema(path: string): Promise<boolean> {
    let hasError = false;
    try {
        const config = await loadConfig();
        const results = await lint({ ref: path, config });

        results.forEach(result => {
            const location = result.location.map(({ pointer, reportOnKey }) => ({
                pointer,
                reportOnKey,
            }));

            if (result.severity === 'warn') {
                logger.warn(
                    JSON.stringify({ location, message: result.message, severity: result.severity })
                );
                return;
            }

            logger.error(
                JSON.stringify({ location, message: result.message, severity: result.severity })
            );
            hasError = true;
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        logger.error(`Failed to validate schema: ${message}`);
        hasError = true;
    }

    return hasError;
}
