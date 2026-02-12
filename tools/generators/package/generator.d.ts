import { Tree } from '@nx/devkit';
import { PackageGeneratorSchema } from './schema';
export declare function packageGenerator(
    tree: Tree,
    options: PackageGeneratorSchema
): Promise<void>;
export default packageGenerator;
