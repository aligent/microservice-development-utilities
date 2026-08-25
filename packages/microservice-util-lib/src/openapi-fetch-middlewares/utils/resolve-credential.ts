import type { Resolvable } from '../types/authentications.js';

/**
 * Resolves an authentication credential that may be provided statically or
 * as a (possibly async) factory function.
 *
 * @param {Resolvable<T>} value - The credential value or factory.
 * @returns {Promise<T>} The resolved credential.
 */
export async function resolveCredential<T>(value: Resolvable<T>): Promise<T> {
    return typeof value === 'function' ? await (value as () => T | Promise<T>)() : value;
}
