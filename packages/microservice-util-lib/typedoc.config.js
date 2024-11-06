/** @type {Partial<import('typedoc').TypeDocOptions>} */
const config = {
    out: 'docs',
    entryPoints: ['./src/index.ts'],
    readme: 'none',
    githubPages: false,
    plugin: ['typedoc-plugin-markdown'],
    entryFileName: 'modules.md',
    useHTMLAnchors: true
};

export default config;
