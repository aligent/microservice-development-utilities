import _ from 'lodash';

/** Turn a type like { foo: number } & { bar: string } into { foo: number; bar: string; } */
export type SimplifyIntersection<A> = A extends object
    ? {
          [K in keyof A]: A[K] extends object ? SimplifyIntersection<A[K]> : A[K];
      }
    : A;

/** A list of keys to keys, with an optional transformer function */
type ObjectMap = readonly (readonly [string, string, ((...args: any[]) => any)?])[];

/**
 * Given a Key, a base Object and an ObjectMap, this will return the
 * type of the property referencable by the Key on the base Object, or in
 * the case where the supplied ObjectMap has a transformer function, it will
 * return the return type of that function instead.
 *
 * @example without a transformer function
 * ```
 * const map = [ ['foo', 'bar'] ] as const;
 *
 * type Foo = GetKeyType<'foo', { foo: number }, (typeof map)[number]>;
 * //   ^ Foo = number
 * ```
 *
 * @example with a transformer function
 * ```
 * const map = [ ['foo', 'bar', String] ] as const;
 *
 * type Foo = GetKeyType<'foo', { foo: number }, (typeof map)[number]>;
 * //   ^ Foo = string
 * ```
 */
type GetKeyType<Key extends string, O extends { [key: string]: any }, M extends ObjectMap[number]> =
    // If the ObjectMap has a transformer function, use that instead of the
    // type of the property on the base object
    M extends readonly [string, string, (...args: any[]) => infer U]
        ? unknown extends U
            ? // If the key is a nested key, recurse into the base object
              // Otherwise, use the type of the property on the base object
              Key extends `${infer K}.${infer Rest}`
                ? GetKeyType<Rest, O[K], M>
                : O[Key]
            : U
        : // Otherwise, use the type of the property on the base object
          Key extends `${infer K}.${infer Rest}`
          ? GetKeyType<Rest, O[K], M>
          : O[Key];

/**
 * Given an ObjectMap, return a new ObjectMap with the first index of each
 * tuple replaced with the value of the second index
 */
type OverrideIndex<M extends ObjectMap[number], V extends string> = readonly [M[0], V, M[2]];

/**
 * Given a key and a base object, return the type of the property referencable
 * by the key on the base object
 * @example
 * ```
 * type Foo = ConstructTypeFromPropertiesInternal<
 *  ['foo.bar', 'foo'],
 *  { foo: { bar: number } }
 *  >;
 *  //   ^ Foo = { foo: number }
 *  ```
 */
type ConstructTypeFromPropertiesInternal<
    M extends ObjectMap[number],
    O extends { [key: string]: any },
> =
    // If the key is a nested key, recurse into the base object
    M[1] extends `${infer P}.${infer Rest}`
        ? { [key in P]: ConstructTypeFromPropertiesInternal<OverrideIndex<M, Rest>, O> }
        : // Otherwise, use the type of the property on the base object
          { [key in M[1]]: GetKeyType<M[0], O, M> };

/**
 * Utility type to get the length of a tuple type
 * @example
 * ```
 * type Foo = Length<[null, null]>;
 * //   ^ Foo = 2
 * ```
 */
type Length<T extends any[] | readonly any[]> = T extends { length: infer L } ? L : never;

/**
 * Utility type to return a tuple type of a specified length
 * @example
 * ```
 * type Foo = BuildTuple<3>;
 * //   ^ Foo = [any, any, any]
 * ```
 */
type BuildTuple<L extends number, T extends any[] = []> = T extends { length: L }
    ? T
    : BuildTuple<L, [...T, any]>;

/**
 * Utility type which adds two numbers together
 * @example
 * ```
 * type Foo = Add<7, 3>;
 * //   ^ Foo = 10
 * ```
 */
type Add<A extends number, B extends number> = Length<[...BuildTuple<A>, ...BuildTuple<B>]>;

/**
 * Given an object, and an array which remaps the keys of that object,
 * return an object with the new structure
 * @example
 * ```
 *
 * type Foo = ConstructTypeFromProperties<
 *   [ ['foo.bar', 'foo'], ['baz', 'bar'] ],
 *   { foo: { bar: number }, baz: string; }
 * >
 * // Foo = {
 * //    foo: number;
 * // } & {
 * //    bar: string;
 * // }
 * ```
 */
type ConstructTypeFromProperties<
    M extends ObjectMap,
    O extends { [key: string]: any },
    L extends number = 0,
> =
    // If the length of M is equal to L, resolve to unknown
    L extends Length<M>
        ? unknown
        : // Otherwise, if the length of M is greater than L, recurse
          // Otherwise, resolve to never
          Add<L, 1> extends number
          ? ConstructTypeFromPropertiesInternal<M[L], O> &
                ConstructTypeFromProperties<M, O, Add<L, 1>>
          : never;

type Remap<
    MapArray extends ObjectMap,
    Original extends { [key: string]: any },
> = SimplifyIntersection<ConstructTypeFromProperties<MapArray, Original>>;

/**
 * Map one object's values to another structure
 * @param object the object to map from
 * @param map the keys for the mapping
 * @returns the remapped object
 *
 * @example without a transformer function
 * ```ts
 * const map = [
 *   ['foo', 'baz'],
 *   ['bar', 'qux.0']
 * ] as const;
 * const obj = { foo: 'hi', bar: 7 }
 * remap(obj, map); // { baz: 'hi', qux: [7] }
 * ```
 * @example with a transformer function
 * ```ts
 * const map = [
 *  ['foo', 'baz'],
 *  ['bar', 'qux.0', (x: number) => x + 1]
 * ] as const;
 * const obj = { foo: 'hi', bar: 7 }
 * remap(obj, map); // { baz: 'hi', qux: [8] }
 * ```
 * @example with an empty initial key
 * ```ts
 * const map = [
 *   ['', 'baz', (x: { foo: number, bar: number }) => x.foo + x.bar]
 * ]
 * const obj = { foo: 3, bar: 7 }
 * remap(obj, map); // { baz: 10 }
 * ```
 */
function remap<Original extends { [key: string]: any }, MapArray extends ObjectMap>(
    object: Original,
    map: MapArray
): Remap<MapArray, Original> {
    const out = {};
    map.forEach(item => {
        const parser = item[2] ? item[2] : (val: any) => val;
        const value = item[0] ? _.get(object, item[0]) : object;
        return _.set(out, item[1], parser(value as any));
    });
    return out as any;
}

export type { Remap, ObjectMap };

export default remap;
