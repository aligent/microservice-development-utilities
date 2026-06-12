import type { Client } from 'openapi-fetch';
import type { MediaType } from 'openapi-typescript-helpers';

/**
 * A Client whose HTTP methods return only the success branch
 * ({ data: D; response: Response }), reflecting the runtime contract
 * when retryMiddleware is registered with throwOnNotOk: true (the default).
 *
 * Errors are thrown as HttpResponseError, never returned in the union.
 */
export type ErrorThrowingClient<
    Paths extends Record<string, unknown>,
    Media extends MediaType = MediaType,
> = {
    [K in keyof Client<Paths, Media>]: Client<Paths, Media>[K] extends (
        ...args: infer A
    ) => Promise<infer R>
        ? (...args: A) => Promise<Extract<R, { error?: never }>>
        : Client<Paths, Media>[K];
};

/**
 * Cast an openapi-fetch Client to an ErrorThrowingClient.
 *
 * Use this after registering retryMiddleware (with default throwOnNotOk: true),
 * which throws HttpResponseError on !response.ok and makes the error branch
 * of the discriminated union unreachable. Zero runtime cost — purely a type narrowing.
 *
 * WARNING: Do not use if retryMiddleware is configured with throwOnNotOk: false.
 */
export function asErrorThrowingClient<
    Paths extends Record<string, unknown>,
    Media extends MediaType = MediaType,
>(client: Client<Paths, Media>): ErrorThrowingClient<Paths, Media> {
    return client as unknown as ErrorThrowingClient<Paths, Media>;
}
