import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { applyAuthMethodConfiguration } from './auth-configurations';

const BASE_CLIENT = `import { logMiddleware, throwOnNotOk } from '@aligent/microservice-util-lib';
export class TestClient {
    public readonly client: any;
    constructor(options: ClientOptions, logger: LoggerInterface) {
        this.client.use(
            throwOnNotOk(),
            logMiddleware('test')
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
                `import { throwOnNotOk } from '@aligent/microservice-util-lib';
export class DifferentClass {}`
            );

            expect(() =>
                applyAuthMethodConfiguration(tree, 'client.ts', 'api-key', 'TestClient')
            ).toThrow('Unable to find class: TestClient');
        });

        it('should throw error when constructor is not found', () => {
            tree.write(
                'client.ts',
                `import { throwOnNotOk } from '@aligent/microservice-util-lib';
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
    constructor(options: ClientOptions, logger: LoggerInterface) {
        this.client.use(
            throwOnNotOk()
        );
    }
}`
            );

            applyAuthMethodConfiguration(tree, 'client.ts', 'basic', 'TestClient');
            const content = tree.read('client.ts', 'utf-8');
            expect(content).toContain('basicAuthMiddleware');
            expect(content).not.toContain(
                "import { throwOnNotOk, basicAuthMiddleware } from '@aligent/microservice-util-lib'"
            );
        });

        it('should insert the auth middleware as an argument of the existing use() call, after throwOnNotOk()', () => {
            tree.write(
                'client.ts',
                `import { logMiddleware, throwOnNotOk } from '@aligent/microservice-util-lib';
export class TestClient {
    public readonly client: any;
    constructor(options: ClientOptions, logger: LoggerInterface) {
        this.client.use(
            throwOnNotOk(),
            logMiddleware('test')
        );
    }
}`
            );

            applyAuthMethodConfiguration(tree, 'client.ts', 'basic', 'TestClient');
            const content = tree.read('client.ts', 'utf-8');

            expect(content).toContain('basicAuthMiddleware({');
            const useIndex = content?.indexOf('this.client.use(') ?? -1;
            const throwIndex = content?.indexOf('throwOnNotOk()') ?? -1;
            const authIndex = content?.indexOf('basicAuthMiddleware({') ?? -1;
            const logIndex = content?.indexOf("logMiddleware('test')") ?? -1;

            // All four still live inside the single this.client.use(...) call, in order.
            expect(useIndex).toBeGreaterThanOrEqual(0);
            expect(useIndex).toBeLessThan(throwIndex);
            expect(throwIndex).toBeLessThan(authIndex);
            expect(authIndex).toBeLessThan(logIndex);

            // No second this.client.use( statement was created.
            expect(content?.split('this.client.use(').length).toBe(2);
        });

        it('should throw when no client.use statement is present to anchor against', () => {
            tree.write(
                'client.ts',
                `import { throwOnNotOk } from '@aligent/microservice-util-lib';
export class TestClient {
    public readonly client: any;
    constructor() {
        this.client = {};
    }
}`
            );

            expect(() =>
                applyAuthMethodConfiguration(tree, 'client.ts', 'basic', 'TestClient')
            ).toThrow('Unable to find a this.client.use(...) statement in class: TestClient');
        });

        describe('api-key auth method', () => {
            it('should add apiKeyAuthMiddleware import', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'api-key', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('apiKeyAuthMiddleware');
            });

            it('should not add a helper function above the class', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'api-key', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).not.toContain('async function');
            });

            it('should include a placeholder header and value in the middleware config', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'api-key', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain("header: 'X-Api-Key'");
                expect(content).toContain("value: 'your-api-key'");
            });
        });

        describe('basic auth method', () => {
            it('should add basicAuthMiddleware import', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'basic', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('basicAuthMiddleware');
            });

            it('should not add a helper function above the class', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'basic', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).not.toContain('async function');
            });

            it('should include placeholder credentials in the middleware config', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'basic', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('credentials: {');
                expect(content).toContain("username: 'your-username'");
                expect(content).toContain("password: 'your-password'");
            });
        });

        describe('oauth2.0 auth method', () => {
            it('should add oAuth20AuthMiddleware import', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'oauth2.0', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('oAuth20AuthMiddleware');
            });

            it('should add a top-level fetchAccessToken helper function above the class', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'oauth2.0', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('async function fetchAccessToken()');

                const helperIndex = content?.indexOf('async function fetchAccessToken') ?? -1;
                const classIndex = content?.indexOf('export class TestClient') ?? -1;
                expect(helperIndex).toBeGreaterThanOrEqual(0);
                expect(helperIndex).toBeLessThan(classIndex);
            });

            it('should call the extracted helper from the middleware config', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'oauth2.0', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('token: async () => fetchAccessToken()');
            });
        });

        describe('oauth1.0a auth method', () => {
            it('should add oAuth10aAuthMiddleware import', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'oauth1.0a', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain('oAuth10aAuthMiddleware');
            });

            it('should not add a helper function above the class', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'oauth1.0a', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).not.toContain('async function');
            });

            it('should include algorithm and placeholder credentials in the middleware config', () => {
                tree.write('client.ts', BASE_CLIENT);

                applyAuthMethodConfiguration(tree, 'client.ts', 'oauth1.0a', 'TestClient');
                const content = tree.read('client.ts', 'utf-8');
                expect(content).toContain("algorithm: 'HMAC-SHA256'");
                expect(content).toContain('credentials: {');
                expect(content).toContain("consumerKey: 'your-consumer-key'");
                expect(content).toContain("consumerSecret: 'your-consumer-secret'");
                expect(content).toContain("tokenSecret: 'your-token-secret'");
            });
        });
    });
});
