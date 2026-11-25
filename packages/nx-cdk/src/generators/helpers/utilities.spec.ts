import { readJsonFile } from '@nx/devkit';
import { join } from 'path';
import {
    assertSafeServicePath,
    assertValidServiceName,
    SAFE_SERVICE_PATH_PATTERN,
    SERVICE_NAME_PATTERN,
} from './utilities';

const GENERATORS_DIR = join(__dirname, '..');

function readSchemaNamePattern(generator: string): string {
    const schema = readJsonFile<{ properties: { name: { pattern: string } } }>(
        join(GENERATORS_DIR, generator, 'schema.json')
    );
    return schema.properties.name.pattern;
}

describe('assertValidServiceName', () => {
    it.each(['a', 'a1', 'my-service', 'my-2fa', 'companies'])('should accept "%s"', name => {
        expect(() => assertValidServiceName(name)).not.toThrow();
    });

    it.each(['2fa', '-a', 'a--b', 'a-', 'a_b', '../x', 'A', '', 'a/b'])(
        'should reject "%s"',
        name => {
            expect(() => assertValidServiceName(name)).toThrow(/Invalid service name/);
        }
    );
});

describe('assertSafeServicePath', () => {
    it.each(['a', 'a-', 'a--b', '2fa', '-a', 'my-service'])('should accept "%s"', name => {
        expect(() => assertSafeServicePath(name)).not.toThrow();
    });

    it.each(['../x', '../../outside', 'a/b', '/a', 'a_b', 'A', '', '.', '..'])(
        'should reject "%s"',
        name => {
            expect(() => assertSafeServicePath(name)).toThrow(/Invalid service name/);
        }
    );
});

describe('service name schema patterns', () => {
    it('should match the validator in the service schema, after the stack/service exclusion', () => {
        const exclusion = '^(?!.*[Ss]tack|.*[Ss]ervice)';

        expect(readSchemaNamePattern('service')).toBe(
            exclusion + SERVICE_NAME_PATTERN.source.replace(/^\^/, '')
        );
    });

    it('should match the path-safety check in the remove-service schema', () => {
        expect(readSchemaNamePattern('remove-service')).toBe(SAFE_SERVICE_PATH_PATTERN.source);
    });

    it.each(['2fa', '-a', 'a--b', 'a-', 'a_b', 'my-stack', 'my-service'])(
        'should reject "%s" in the service schema',
        name => {
            expect(new RegExp(readSchemaNamePattern('service')).test(name)).toBe(false);
        }
    );

    it.each(['a', 'a1', 'my-2fa'])('should accept "%s" in the service schema', name => {
        expect(new RegExp(readSchemaNamePattern('service')).test(name)).toBe(true);
    });
});
