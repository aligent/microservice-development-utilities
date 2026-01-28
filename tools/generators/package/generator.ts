import { formatFiles, generateFiles, Tree, updateJson } from '@nx/devkit';
import { join } from 'path';
import { PackageGeneratorSchema } from './schema';

export async function packageGenerator(tree: Tree, options: PackageGeneratorSchema) {
    const { name, description } = options;
    const projectRoot = `packages/${name}`;

    if (tree.exists(projectRoot)) {
        throw new Error(`Package "${name}" already exists at ${projectRoot}`);
    }

    generateFiles(tree, join(__dirname, 'files'), projectRoot, {
        name,
        scopedName: `@aligent/${name}`,
        description,
        template: '',
    });

    // Add TypeScript project reference to root tsconfig.json
    updateJson(tree, 'tsconfig.json', json => {
        json.references = json.references || [];

        const referencePath = `./${projectRoot}`;
        if (json.references.some((r: { path: string }) => r.path === referencePath)) {
            throw new Error(`A reference to "${referencePath}" already exists in tsconfig.json`);
        }

        json.references.push({ path: referencePath });

        return json;
    });

    await formatFiles(tree);
}

export default packageGenerator;
