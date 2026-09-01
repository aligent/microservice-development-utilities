/** @type {Partial<import('typedoc').TypeDocOptions>} */
const config = {
    plugin: ['typedoc-plugin-markdown'],
    entryPoints: ['./src/index.ts'],
    out: 'docs',
    readme: 'none',
    githubPages: false,
    // The 2 configs below comes from typedoc-plugin-markdown
    entryFileName: 'modules.md',
    useHTMLAnchors: true,
};

export default config;
