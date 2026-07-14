/**
 * @module throwing-client
 *
 * An `ErrorThrowingClient` wrapper around `openapi-fetch` whose HTTP methods
 * return only the success branch of `FetchResponse`, reflecting the runtime
 * contract when `retryMiddleware` is registered with `throwOnNotOk: true`.
 *
 * **TS2590 fix** — The original implementation used a mapped conditional type
 * with `Extract<FetchResponse<...>, { error?: never }>`, which caused
 * TypeScript to eagerly expand the full response union across all API paths,
 * triggering TS2590 ("Expression produces a union type that is too complex to
 * represent") on schemas with ~70+ endpoints. The current implementation fixes
 * this by:
 *
 * 1. Using explicit generic method signatures instead of a mapped type, so
 *    generics are preserved and evaluation is deferred to the call site.
 * 2. Reconstructing the success response type directly (`SuccessOnlyResponse`)
 *    instead of filtering a union with `Extract`.
 *
 * See {@link ./ard/ErrorThrowingClient-TS2590-Fix.md | ErrorThrowingClient-TS2590-Fix.md}
 * for full details on the problem, solution, trade-offs, and mitigations.
 */

import type { ClientOptions, MaybeOptionalInit, Middleware, ParseAsResponse } from 'openapi-fetch';
export type { ClientOptions } from 'openapi-fetch';
import createClient from 'openapi-fetch';
import type {
    HttpMethod,
    MediaType,
    PathsWithMethod,
    Readable,
    RequiredKeysOf,
    ResponseObjectMap,
    SuccessResponse,
} from 'openapi-typescript-helpers';

type InitParam<Init> =
    RequiredKeysOf<Init> extends never
        ? [(Init & { [key: string]: unknown })?]
        : [Init & { [key: string]: unknown }];

/**
 * The success branch of FetchResponse, reconstructed directly instead of
 * using Extract. Extract<FetchResponse<...>, { error?: never }> forces
 * TypeScript to eagerly expand the full FetchResponse union across all paths,
 * triggering TS2590 on schemas with ~70+ endpoints. Reconstructing the
 * success branch avoids the union-wide filter entirely.
 */
type SuccessOnlyResponse<
    T extends Record<string | number, unknown>,
    Options,
    Media extends MediaType,
> = {
    data: ParseAsResponse<Readable<SuccessResponse<ResponseObjectMap<T>, Media>>, Options>;
    error?: never;
    response: Response;
};

/**
 * Like ClientMethod, but returns only the success branch of FetchResponse.
 *
 * Uses the same Paths constraint as openapi-fetch's ClientMethod so that
 * Paths[Path][Method] indexing is valid. The outer ErrorThrowingClient uses
 * Paths extends {} (matching Client), and TypeScript defers the stricter
 * constraint check until concrete instantiation — same pattern as Client + ClientMethod.
 */
type ThrowingClientMethod<
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Matches openapi-fetch's ClientMethod constraint where {} means "any object shape"
    Paths extends Record<string, Record<HttpMethod, {}>>,
    Method extends HttpMethod,
    Media extends MediaType,
> = <
    Path extends PathsWithMethod<Paths, Method>,
    Init extends MaybeOptionalInit<Paths[Path], Method>,
>(
    url: Path,
    ...init: InitParam<Init>
) => Promise<SuccessOnlyResponse<Paths[Path][Method], Init, Media>>;

/**
 * A Client whose HTTP methods return only the success branch
 * ({ data: D; response: Response }), reflecting the runtime contract
 * when retryMiddleware is registered with throwOnNotOk: true (the default).
 *
 * Errors are thrown as HttpResponseError, never returned in the union.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Matches openapi-fetch's Client<Paths extends {}> constraint
export interface ErrorThrowingClient<Paths extends {}, Media extends MediaType = MediaType> {
    GET: ThrowingClientMethod<Paths, 'get', Media>;
    PUT: ThrowingClientMethod<Paths, 'put', Media>;
    POST: ThrowingClientMethod<Paths, 'post', Media>;
    DELETE: ThrowingClientMethod<Paths, 'delete', Media>;
    OPTIONS: ThrowingClientMethod<Paths, 'options', Media>;
    HEAD: ThrowingClientMethod<Paths, 'head', Media>;
    PATCH: ThrowingClientMethod<Paths, 'patch', Media>;
    TRACE: ThrowingClientMethod<Paths, 'trace', Media>;
    use(...middleware: Middleware[]): void;
    eject(...middleware: Middleware[]): void;
}

/**
 * Create an openapi-fetch client and cast it to an ErrorThrowingClient.
 *
 * This is a convenience wrapper around createClient + asErrorThrowingClient.
 * The caller MUST register retryMiddleware (with default throwOnNotOk: true)
 * on the returned client for the type guarantee to hold at runtime.
 *
 * WARNING: Do not use if retryMiddleware is configured with throwOnNotOk: false.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Matches openapi-fetch's Client<Paths extends {}> constraint
export function createErrorThrowingClient<Paths extends {}, Media extends MediaType = MediaType>(
    options: ClientOptions
) {
    return createClient({ ...options }) as ErrorThrowingClient<Paths, Media>;
}
