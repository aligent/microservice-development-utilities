import hasDefinedProperties from './has-properties-defined.js';

interface Foo {
    bar?: number;
    baz?: boolean;
    qux?: string;
}

describe('verifyDefined', () => {
    it('should return the object as-is when checks are met', () => {
        const obj: Foo = {
            bar: 7,
            baz: true,
        };

        expect(hasDefinedProperties(obj, 'bar', 'baz')).toBeTruthy();
    });

    it('should throw an error if a property is missing', () => {
        const obj: Foo = {
            bar: 7,
            baz: true,
        };

        expect(hasDefinedProperties(obj, 'qux')).toBeFalsy();
    });

    it('should list the missing properties when it errors', () => {
        const obj: Foo = {
            bar: 7,
        };

        expect(hasDefinedProperties(obj, 'qux', 'baz', 'bar')).toBeFalsy();
    });

    it('should still return true if the values are defined but falsey', () => {
        const obj: Foo = {
            bar: 0,
            baz: false,
            qux: '',
        };

        expect(hasDefinedProperties(obj, 'bar', 'baz', 'qux')).toBeTruthy();
    });
});
