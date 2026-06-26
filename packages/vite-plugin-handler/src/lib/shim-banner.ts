/**
 * ESM shim that defines __dirname and __filename for bundled CJS dependencies
 * that reference them at runtime.
 */
export const shimBanner = `import { fileURLToPath as __shim_fileURLToPath } from 'node:url';
import { dirname as __shim_dirname } from 'node:path';
const __filename = __shim_fileURLToPath(import.meta.url);
const __dirname = __shim_dirname(__filename);`;
