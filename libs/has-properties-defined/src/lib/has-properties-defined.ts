import { SimplifyIntersection } from '@aligent/remap';

/**
 * Ensure that the given properties are defined on the object.
 * @param obj The object to check.
 * @param keys The keys to check.
 * @returns `true` if the object has the given properties defined, `false` otherwise.
 *
 * @example
 * ```ts
 * type Foo = { a?: number; b?: number };
 * const foo: Foo = { a: 1, b: 2 };
 * if (hasDefinedProperties(foo, 'a')) {
 *   console.log(foo);
 *  //          ^? const bar: {
 *  //               a: number;
 *  //               b?: number;
 *  //             }
 * }
 * ```
 */
function hasDefinedProperties<
  T extends { [key: string]: unknown },
  K extends keyof T
>(
  obj: T | object,
  ...keys: K[]
): obj is SimplifyIntersection<Required<Pick<T, K>> & Omit<T, K>> {

  for (const key of keys) {
    if ((obj as T)[key] === undefined || (obj as T)[key] === null) {
      return false;
    }
  }

  return true;
}

export default hasDefinedProperties;
