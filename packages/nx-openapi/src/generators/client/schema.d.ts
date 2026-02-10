export interface ClientGeneratorSchema {
    name: string;
    schemaPath: string;
    configPath?: string;
    importPath?: string;
    skipValidate: boolean;
    override: boolean;
    authMethod?: string;
}
