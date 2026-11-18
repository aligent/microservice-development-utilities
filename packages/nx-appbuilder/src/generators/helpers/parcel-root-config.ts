/**
 * Parcel resolves its plugin configuration from the *project root* — the
 * nearest directory with a lockfile — which in a workspace is the root
 * package.json, not the app's own. Without `packageExports` there, an admin UI
 * app's web build fails to resolve `#app.commerce.config` (and the `exports`
 * maps that Spectrum S2 and the Adobe libs publish), even though the app
 * generator writes the same setting into the app.
 *
 * Shared by the preset (which writes it into a fresh workspace) and the app
 * generator (which merges it into an existing root when it renders an admin UI).
 */
export const PARCEL_ROOT_CONFIG = {
    '@parcel/resolver-default': {
        packageExports: true,
    },
} as const;
