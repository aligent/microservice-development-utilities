export interface ConditionalShim {
    /** Substrings to search for in the rendered chunk — matches if any is found. */
    needles: string[];
    /** Import statement(s) to prepend when a needle is found. */
    statement: string;
}

const cjsDirnameFilenameShim = [
    `import { fileURLToPath as __shim_fileURLToPath } from 'node:url';`,
    `import { dirname as __shim_dirname } from 'node:path';`,
    'const __filename = __shim_fileURLToPath(import.meta.url);',
    'const __dirname = __shim_dirname(__filename);',
];

/**
 * Conditional shims injected via `renderChunk` only when the bundled output
 * references the corresponding identifiers.
 *
 * @todo Remove entries as rolldown fixes the underlying emit bugs.
 */
const CONDITIONAL_SHIMS: ConditionalShim[] = [
    {
        // Bundled CJS code may reference __dirname / __filename which don't
        // exist in ESM. Inject the shim only when actually needed.
        needles: ['__dirname', '__filename'],
        statement: cjsDirnameFilenameShim.join('\n'),
    },
    {
        // The AWS SDK smithy HTTP/2 handler references `node_http2` but
        // rolldown drops `import … from 'node:http2'`, leaving it undefined.
        needles: ['node_http2'],
        statement: `import * as node_http2 from 'node:http2';`,
    },
];

/**
 * Resolves the active shims list from the user-facing `shims` option.
 *
 * @param shims - Controls which conditional shims are active.
 *   - `true` / `undefined` (default): use the built-in shims.
 *   - `false`: disable all shims (returns empty array).
 *   - `ConditionalShim[]`: replace the built-in shims with user-defined ones.
 */
export function resolveShims(shims?: boolean | ConditionalShim[]): ConditionalShim[] {
    if (Array.isArray(shims)) return shims;
    if (shims === false) return [];
    return CONDITIONAL_SHIMS;
}
