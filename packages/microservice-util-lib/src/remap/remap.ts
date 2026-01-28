/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Get a value from an object using a dot-notation path
 * @param obj The object to get the value from
 * @param path The dot-notation path (e.g., 'foo.bar.baz')
 * @returns The value at the path, or undefined if not found
 */
function getValue(obj: any, path: string): any {
    let current = obj;
    for (const key of path.split('.')) {
        if (current == null) return undefined;
        current = current[key];
    }
    return current;
}

/**
 * Check if a key looks like an array index (numeric string)
 */
function isArrayIndex(key: string): boolean {
    return /^\d+$/.test(key);
}

/**
 * Set a value in an object using a dot-notation path
 * @param obj The object to set the value in
 * @param path The dot-notation path (e.g., 'foo.bar.baz')
 * @param value The value to set
 */
function setValue(obj: any, path: string, value: any): void {
    const keys = path.split('.').filter(key => !!key); // Skip empty keys, e.g. in 'foo..bar'
    const lastKey = keys.pop();

    if (!lastKey) {
        // Somehow we've been given a path with no keys, so we can't set anything
        return;
    }

    // Navigate to the parent object, creating nested structures as needed
    let current = obj;
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i] as string; // We've already filtered out empty keys, so this is safe

        // If this key already has a valid object to put the next key on, continue
        if (key in current && typeof current[key] === 'object' && current[key] !== null) {
            current = current[key];
            continue;
        }

        // Otherwise, set the current key as an object or array based on what the next key is
        const nextKey = keys.at(i + 1) ?? lastKey;
        current[key] = isArrayIndex(nextKey) ? [] : {};

        current = current[key];
    }

    // Set the final value
    current[lastKey] = value;
}

/** Turn a type like { foo: number } & { bar: string } into { foo: number; bar: string; } */
export type SimplifyIntersection<A> = A extends object
    ? {
          [K in keyof A]: A[K] extends object ? SimplifyIntersection<A[K]> : A[K];
      }
    : A;

/** A list of keys to keys, with an optional transformer function */
type ObjectMap = ReadonlyArray<readonly [string, string, ((...args: any[]) => any)?]>;

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
type OverrideIndex<M extends ObjectMap[number], V extends string> = M extends readonly [
    unknown,
    unknown,
    infer T,
]
    ? readonly [M[0], V, T]
    : readonly [M[0], V];

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
    M[1] extends `${infer P extends string}.${infer Rest extends string}`
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
        const value = item[0] ? getValue(object, item[0]) : object;
        setValue(out, item[1], parser(value as any));
    });
    return out as any;
}

export type { ObjectMap, Remap };

export default remap;
