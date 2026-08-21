/**
 * Collect the method names of a class, walking the prototype chain up to but
 * excluding `Object.prototype` so inherited methods are found.
 *
 * Property *descriptors* are inspected rather than properties read: reading a
 * prototype getter here would execute consumer code with `this` bound to the
 * mock. Accessor properties are therefore neither mockable nor throwable.
 */
function collectMethodNames(prototype: object): Set<string> {
    const names = new Set<string>();

    let current: object | null = prototype;
    while (current !== null && current !== Object.prototype) {
        for (const key of Object.getOwnPropertyNames(current)) {
            if (key === 'constructor') continue;
            const descriptor = Object.getOwnPropertyDescriptor(current, key);
            if (typeof descriptor?.value === 'function') names.add(key);
        }
        current = Object.getPrototypeOf(current) as object | null;
    }

    return names;
}

/**
 * Build a stand-in for a service class from an object of method overrides, for
 * use in unit tests of code that depends on the service.
 *
 * Accessing a method of the class that was not overridden throws immediately,
 * naming the service and the method, rather than failing later as
 * `is not a function`. Any other key falls through to the overrides object —
 * so `toString`, `valueOf` and `constructor` resolve from `Object.prototype`
 * as usual, and anything else is `undefined`. That fallback is what keeps
 * probe properties safe: `then` (so awaiting the mock does not throw),
 * `Symbol.toStringTag`, inspection symbols, and whatever a test framework's
 * error serialiser reaches for.
 *
 * The helper imports no test framework: callers supply their own spies, and
 * overridden keys keep the caller's spy type so `.mock` resolves through the
 * returned object.
 *
 * @example
 * ```typescript
 * const getJsonObject = vi.fn().mockResolvedValue({ id: 1 });
 * const s3 = createMockService(S3Service, { getJsonObject });
 *
 * await handler({ s3 });
 *
 * expect(s3.getJsonObject.mock.calls).toHaveLength(1);
 * ```
 *
 * @param service - The service class itself. It is never constructed — only
 * its prototype is read — so the parameter is typed as just that capability,
 * which also accepts abstract classes and classes with required constructor
 * arguments. Passing the class as a value (rather than as an explicit type
 * argument) is load-bearing for the types: TypeScript has no partial
 * type-argument inference, so an explicit `T` would suppress inference of the
 * overrides type and lose the caller's spy typing on overridden keys.
 * @param overrides - The methods the code under test actually calls. Keys are
 * checked against the class's public surface, so a typo or a wrong-shaped
 * override is a compile error.
 */
export function createMockService<T extends object, O extends Partial<T>>(
    service: { prototype: T },
    overrides: O
): T & O {
    const { prototype } = service;
    const methodNames = collectMethodNames(prototype);
    const className = (prototype as { constructor?: { name?: string } }).constructor?.name;

    const isUnmockedMethod = (key: string | symbol): key is string =>
        typeof key === 'string' && methodNames.has(key);

    const mock = new Proxy(overrides, {
        get(target, key, receiver) {
            if (Reflect.has(target, key)) return Reflect.get(target, key, receiver);
            if (isUnmockedMethod(key)) {
                throw new Error(`${className ?? 'Service'}.${key} was accessed but not mocked`);
            }
            return undefined;
        },
        has(target, key) {
            return Reflect.has(target, key) || isUnmockedMethod(key);
        },
        ownKeys(target) {
            return [...new Set([...Reflect.ownKeys(target), ...methodNames])];
        },
        getOwnPropertyDescriptor(target, key) {
            const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
            if (descriptor !== undefined) return descriptor;
            if (!isUnmockedMethod(key)) return undefined;
            // Enumerable and configurable so `Object.keys` reports the method
            // without violating the proxy invariants for a key the target
            // does not own.
            return { configurable: true, enumerable: true, value: undefined, writable: false };
        },
    });

    // The services declare `private readonly client` / `private readonly logger`.
    // Those fields are nominal, so no structurally-constructed value is
    // assignable to the class type — this cast is unavoidable. Concentrating
    // it here is the point of the helper: consumer test suites contain none.
    return mock as unknown as T & O;
}
