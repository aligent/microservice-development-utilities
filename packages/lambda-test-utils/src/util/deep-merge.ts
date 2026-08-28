type PlainObject = Record<string, unknown>;

type DeepPartial<T> = T extends readonly unknown[]
    ? T
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

function isPlainObject(value: unknown): value is PlainObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Merges `overrides` onto `base`, recursing into nested plain objects
 * (e.g. `requestContext`, `identity`) so a partial override doesn't wipe
 * sibling defaults. Arrays and primitives are replaced outright.
 */
export function deepMerge<T>(base: T, overrides?: DeepPartial<NoInfer<T>>): T {
    if (!overrides) {
        return base;
    }

    const result: PlainObject = { ...(base as PlainObject) };

    for (const [key, overrideValue] of Object.entries(overrides as PlainObject)) {
        const baseValue = result[key];
        result[key] =
            isPlainObject(baseValue) && isPlainObject(overrideValue)
                ? deepMerge(baseValue, overrideValue)
                : overrideValue;
    }

    return result as T;
}
