import { Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { serviceGenerator } from '../service/generator';
import { removeGenerator } from './generator';

const serviceStacksContent = `import { SharedInfraStack } from '@libs/infra';
import { Stage, type StageProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';

export class ApplicationStage extends Stage {
    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);

        const sharedInfra = new SharedInfraStack(this, 'shared-infra', props);

        // Service stacks initialization
    }
}
`;

const application = {
    name: 'application',
    type: 'module',
    main: './bin/main.ts',
    types: './bin/main.ts',
    nx: { tags: ['scope:application'] },
};

const rootPackageJson = {
    name: '@test/integrations',
    workspaces: ['application', 'libs/*'],
};

function setupTree() {
    const tree = createTreeWithEmptyWorkspace();
    tree.write(
        'tsconfig.json',
        JSON.stringify({
            extends: './tsconfig.base.json',
            compileOnSave: false,
            files: [],
            references: [],
        })
    );
    tree.write('application/package.json', JSON.stringify(application));
    tree.write('application/lib/service-stacks.ts', serviceStacksContent);
    tree.write('package.json', JSON.stringify(rootPackageJson));
    return tree;
}

describe('remove generator', () => {
    let tree: Tree;

    beforeEach(() => {
        tree = setupTree();
    });

    it('should remove the service directory', async () => {
        await serviceGenerator(tree, { name: 'companies' });
        expect(tree.exists('services/companies')).toBe(true);

        await removeGenerator(tree, { name: 'companies' });
        expect(tree.exists('services/companies')).toBe(false);
    });

    it('should remove the tsconfig reference', async () => {
        await serviceGenerator(tree, { name: 'companies' });

        const tsconfigBefore = JSON.parse(tree.read('tsconfig.json', 'utf-8') ?? '{}');
        expect(tsconfigBefore.references).toContainEqual({ path: './services/companies' });

        await removeGenerator(tree, { name: 'companies' });

        const tsconfigAfter = JSON.parse(tree.read('tsconfig.json', 'utf-8') ?? '{}');
        expect(tsconfigAfter.references).not.toContainEqual({ path: './services/companies' });
    });

    it('should remove the import from service-stacks.ts', async () => {
        await serviceGenerator(tree, { name: 'companies' });

        const stacksBefore = tree.read('application/lib/service-stacks.ts', 'utf-8');
        expect(stacksBefore).toContain("@services/companies");

        await removeGenerator(tree, { name: 'companies' });

        const stacksAfter = tree.read('application/lib/service-stacks.ts', 'utf-8');
        expect(stacksAfter).not.toContain("@services/companies");
    });

    it('should remove the stack instantiation from service-stacks.ts', async () => {
        await serviceGenerator(tree, { name: 'companies' });

        const stacksBefore = tree.read('application/lib/service-stacks.ts', 'utf-8');
        expect(stacksBefore).toContain('new CompaniesStack(');

        await removeGenerator(tree, { name: 'companies' });

        const stacksAfter = tree.read('application/lib/service-stacks.ts', 'utf-8');
        expect(stacksAfter).not.toContain('new CompaniesStack(');
    });

    it('should only remove the targeted service when multiple services exist', async () => {
        await serviceGenerator(tree, { name: 'companies' });
        await serviceGenerator(tree, { name: 'orders' });

        await removeGenerator(tree, { name: 'companies' });

        // Companies should be removed
        expect(tree.exists('services/companies')).toBe(false);
        const stacks = tree.read('application/lib/service-stacks.ts', 'utf-8');
        expect(stacks).not.toContain('@services/companies');
        expect(stacks).not.toContain('new CompaniesStack(');

        // Orders should remain
        expect(tree.exists('services/orders')).toBe(true);
        expect(stacks).toContain('@services/orders');
        expect(stacks).toContain('new OrdersStack(');

        const tsconfig = JSON.parse(tree.read('tsconfig.json', 'utf-8') ?? '{}');
        expect(tsconfig.references).not.toContainEqual({ path: './services/companies' });
        expect(tsconfig.references).toContainEqual({ path: './services/orders' });
    });

    it('should handle removal when service-stacks.ts does not exist', async () => {
        tree.delete('application/lib/service-stacks.ts');
        tree.write('services/companies/package.json', '{}');
        tree.write(
            'tsconfig.json',
            JSON.stringify({
                references: [{ path: './services/companies' }],
            })
        );

        await expect(removeGenerator(tree, { name: 'companies' })).resolves.not.toThrow();
        expect(tree.exists('services/companies')).toBe(false);
    });

    it('should remove workspace entry from root package.json', async () => {
        tree.write(
            'package.json',
            JSON.stringify({
                ...rootPackageJson,
                workspaces: ['application', 'libs/*', 'services/companies'],
            })
        );

        await serviceGenerator(tree, { name: 'companies' });
        await removeGenerator(tree, { name: 'companies' });

        const pkg = JSON.parse(tree.read('package.json', 'utf-8') ?? '{}');
        expect(pkg.workspaces).not.toContain('services/companies');
    });
});
