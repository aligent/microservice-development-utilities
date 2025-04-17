declare module 'openapi-typescript' {
    import type { Readable } from 'node:stream';
    import { astToString, OpenAPI3, OpenAPITSOptions } from 'openapi-typescript/dist/index.js';
    import ts from 'typescript';

    export default function openapiTS(
        source: string | URL | OpenAPI3 | Buffer | Readable,
        options?: OpenAPITSOptions
    ): Promise<ts.Node[]>;

    export { astToString };
}
