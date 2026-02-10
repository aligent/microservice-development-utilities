import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { applyAuthMethodConfiguration } from './auth-configurations';

const BASE_CLIENT = `import { retryMiddleware } from '@aligent/microservice-util-lib';
export class TestClient {
    public readonly client: any;
    constructor() {
        this.client.use(
            retryMiddleware({})
        );
    }
}`;

describe('auth-configurations', () => {
    let tree: Tree;

    beforeEach(() => {
        tree = createTreeWithEmptyWorkspace();
    });

    describe('applyAuthMethodConfiguration', () => {
        it('should throw error for unknown auth method', () => {
            tree.write('client.ts', 'export class TestClient {}');

            expect(() =>
                applyAuthMethodConfiguration(tree, 'client.ts', 'unknown-method', 'TestClient')
            ).toThrow('Unknown auth method: unknown-method');
        });

        it('should throw error when file cannot be read', () => {
            expect(() =>
                applyAuthMethodConfiguration(tree, 'non-existent.ts', 'api-key', 'TestClient')
            ).toThrow('Unable to read file: non-existent.ts');
        });

        it('should throw error when class is not found', () => {
            tree.write(
                'client.ts',
                `import { retryMiddleware } from '@aligent/microservice-util-lib';
export class DifferentClass {}`
            );

            expect(() =>
                applyAuthMethodConfiguration(tree, 'client.ts', 'api-key', 'TestClient')
            ).toThrow('Unable to find class: TestClient');
        });

        it('should throw error when constructor is not found', () => {
            tree.write(
                'client.ts',
                `import { retryMiddleware } from '@aligent/microservice-util-lib';
export class TestClient {
    public readonly client: any;
}`
            );

            expect(() =>
                applyAuthMethodConfiguration(tree, 'client.ts', 'api-key', 'TestClient')
            ).toThrow('Unable to find constructor in class: TestClient');
        });

        it('should handle missing util-lib import declaration', () => {
            tree.write(
                'client.ts',
                `export class TestClient {
    public readonly client: any;
    constructor() {
        this.client.use(
            retryMiddleware({})
        );
    }
}`
            );

            applyAuthMethodConfiguration(tree, 'client.ts', 'basic', 'TestClient');
            const content = tree.read('client.ts', 'utf-8');
            expect(content).toContain('basicAuthMiddleware');
            expect(content).not.toContain(
                "import { retryMiddleware, basicAuthMiddleware } from '@aligent/microservice-util-lib'"
            );
        });

        it('should not insert middleware when retryMiddleware statement is not found', () => {
            tree.write(
                'client.ts',
                `import { retryMiddleware } from '@aligent/microservice-util-lib';
export class TestClient {
    public readonly client: any;
    constructor() {
        this.client = {};
    }
}`
            );

            applyAuthMethodConfiguration(tree, 'client.ts', 'basic', 'TestClient');
            const content = tree.read('client.ts', 'utf-8');
            expect(content).not.toContain('basicAuthMiddleware({');
        });

        describe('api-key auth method', () => {
            it('should add fetchSsmParams and apiKeyAuthMiddleware imports', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'api-key', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('fetchSsmParams');
                expect(content).toContain('apiKeyAuthMiddleware');
            });

            it('should add credential class property before client property', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'api-key', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('private credential: string | null = null');
                const credentialIndex = content!.indexOf('credential');
                const clientIndex = content!.indexOf('client:');
                expect(credentialIndex).toBeLessThan(clientIndex);
            });

            it('should add credentialPath constructor parameter', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'api-key', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('credentialPath: string');
            });

            it('should insert apiKeyAuthMiddleware before retryMiddleware', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'api-key', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                const apiKeyIndex = content!.indexOf('apiKeyAuthMiddleware({');
                const retryIndex = content!.indexOf('retryMiddleware({');
                expect(apiKeyIndex).toBeGreaterThan(-1);
                expect(apiKeyIndex).toBeLessThan(retryIndex);
            });

            it('should include X-Api-Key header and fetchSsmParams in middleware config', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'api-key', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain("header: 'X-Api-Key'");
                expect(content).toContain('fetchSsmParams(credentialPath)');
                expect(content).toContain('this.credential');
            });

            it('should skip adding credential property when client property is missing', () => {
                tree.write(
                    'client.ts',
                    `import { retryMiddleware } from '@aligent/microservice-util-lib';
export class TestClient {
    constructor() {
        this.client.use(
            retryMiddleware({})
        );
    }
}`
                );

                applyAuthMethodConfiguration(tree, 'client.ts', 'api-key', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('apiKeyAuthMiddleware');
                expect(content).not.toContain('private credential');
            });
        });

        describe('basic auth method', () => {
            it('should add basicAuthMiddleware import', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'basic', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('basicAuthMiddleware');
            });

            it('should insert basicAuthMiddleware before retryMiddleware', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'basic', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                const basicIndex = content!.indexOf('basicAuthMiddleware({');
                const retryIndex = content!.indexOf('retryMiddleware({');
                expect(basicIndex).toBeGreaterThan(-1);
                expect(basicIndex).toBeLessThan(retryIndex);
            });

            it('should not add class property or constructor parameter', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'basic', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).not.toContain('private credential');
                expect(content).not.toContain('credentialPath');
            });

            it('should include credentials config in middleware', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'basic', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('credentials: async () =>');
                expect(content).toContain('username:');
                expect(content).toContain('password:');
            });
        });

        describe('oauth2.0 auth method', () => {
            it('should add oAuth20AuthMiddleware import', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'oauth2.0', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('oAuth20AuthMiddleware');
            });

            it('should insert oAuth20AuthMiddleware before retryMiddleware', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'oauth2.0', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                const oauthIndex = content!.indexOf('oAuth20AuthMiddleware({');
                const retryIndex = content!.indexOf('retryMiddleware({');
                expect(oauthIndex).toBeGreaterThan(-1);
                expect(oauthIndex).toBeLessThan(retryIndex);
            });

            it('should not add class property or constructor parameter', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'oauth2.0', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).not.toContain('private credential');
                expect(content).not.toContain('credentialPath');
            });

            it('should include token config in middleware', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'oauth2.0', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('token: async () =>');
            });
        });

        describe('oauth1.0a auth method', () => {
            it('should add oAuth10aAuthMiddleware import', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'oauth1.0a', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('oAuth10aAuthMiddleware');
            });

            it('should insert oAuth10aAuthMiddleware before retryMiddleware', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'oauth1.0a', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                const oauthIndex = content!.indexOf('oAuth10aAuthMiddleware({');
                const retryIndex = content!.indexOf('retryMiddleware({');
                expect(oauthIndex).toBeGreaterThan(-1);
                expect(oauthIndex).toBeLessThan(retryIndex);
            });

            it('should not add class property or constructor parameter', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'oauth1.0a', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).not.toContain('private credential');
                expect(content).not.toContain('credentialPath');
            });

            it('should include algorithm and credentials config in middleware', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'oauth1.0a', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain("algorithm: 'HMAC-SHA256'");
                expect(content).toContain('credentials: async () =>');
                expect(content).toContain('consumerKey:');
                expect(content).toContain('consumerSecret:');
                expect(content).toContain('tokenSecret:');
            });
        });
    });
});
