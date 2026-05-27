import { readJsonFile } from '@nx/devkit';

export interface TemplatePackageJson {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

/**
 * Read a generator's `template-package/package.json`. Each generator keeps its
 * version pins in a real package.json (rather than hard-coding versions in TS)
 * so Dependabot can track and bump them via PR.
 *
 * `generatorDir` is the directory containing the generator's compiled code —
 * pass `__dirname` from the caller. The template lives at
 * `<generatorDir>/template-package/package.json`.
 */
export function loadTemplatePackage(generatorDir: string): TemplatePackageJson {
    return readJsonFile<TemplatePackageJson>(`${generatorDir}/template-package/package.json`);
}

/**
 * Extract the requested entries from a dependency map, preserving the version
 * spec. Throws if any requested name is missing — keeps the template-package
 * file as the single source of truth and surfaces drift loudly.
 */
export function pickVersions(
    source: Record<string, string> | undefined,
    names: readonly string[]
): Record<string, string> {
    const result: Record<string, string> = {};
    for (const name of names) {
        const version = source?.[name];
        if (version === undefined) {
            throw new Error(`Missing "${name}" in template-package.json`);
        }
        result[name] = version;
    }
    return result;
}
