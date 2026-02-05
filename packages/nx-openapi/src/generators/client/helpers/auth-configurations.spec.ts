import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { applyAuthMethodConfiguration } from './auth-configurations';

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
        this.client.use(retryMiddleware({}));
    }
}`
            );

            // Should not throw, just skip adding imports
            applyAuthMethodConfiguration(tree, 'client.ts', 'basic', 'TestClient');
            const content = tree.read('client.ts', 'utf-8');
            // Without util-lib import, middleware import won't be added but class is still modified
            expect(content).toContain('TestClient');
        });

        it('should handle class without client property for api-key auth', () => {
            tree.write(
                'client.ts',
                `import { retryMiddleware } from '@aligent/microservice-util-lib';
export class TestClient {
    constructor() {
        this.client.use(retryMiddleware({}));
    }
}`
            );

            // Should not throw when client property is missing
            applyAuthMethodConfiguration(tree, 'client.ts', 'api-key', 'TestClient');
            const content = tree.read('client.ts', 'utf-8');
            expect(content).toContain('apiKeyAuthMiddleware');
        });

        it('should handle constructor without retryMiddleware', () => {
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
            // Middleware should not be inserted if retryMiddleware pattern not found
            expect(content).not.toContain('basicAuthMiddleware({');
        });

        it('should add extra imports for api-key auth method', () => {
            tree.write(
                'client.ts',
                `import { retryMiddleware } from '@aligent/microservice-util-lib';
export class TestClient {
    public readonly client: any;
    constructor() {
        this.client.use(
            retryMiddleware({})
        );
    }
}`
            );

            applyAuthMethodConfiguration(tree, 'client.ts', 'api-key', 'TestClient');
            const content = tree.read('client.ts', 'utf-8');
            expect(content).toContain('fetchSsmParams');
            expect(content).toContain('apiKeyAuthMiddleware');
        });

        it('should insert middleware before retryMiddleware', () => {
            // The pattern looks for exactly 'this.client.use(\n            retryMiddleware'
            tree.write(
                'client.ts',
                `import { retryMiddleware } from '@aligent/microservice-util-lib';
export class TestClient {
    public readonly client: any;
    constructor() {
        this.client.use(
            retryMiddleware({})
        );
    }
}`
            );

            applyAuthMethodConfiguration(tree, 'client.ts', 'oauth2.0', 'TestClient');
            const content = tree.read('client.ts', 'utf-8');
            expect(content).toContain('oAuth20AuthMiddleware');
        });
    });
});
