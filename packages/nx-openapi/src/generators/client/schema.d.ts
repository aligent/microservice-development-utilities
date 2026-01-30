export type AuthMethod = 'api-key' | 'oauth1.0a' | 'basic' | 'oauth2.0';

export interface ClientGeneratorSchema {
    name: string;
    schemaPath: string;
    configPath?: string;
    importPath?: string;
    skipValidate: boolean;
    override: boolean;
    authMethod?: AuthMethod;
}
