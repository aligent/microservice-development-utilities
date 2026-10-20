---
nx-appbuilder: minor
---

Update the `app` generator for `@adobe/aio-commerce-lib-app` 2.0 and fix the admin UI build on a fresh app.

- The action registry script derives URLs from `app.config.yaml` and `.env` instead of `aio app get-url`, which throws for `commerce/backend-ui/2` apps. Only web actions are included; `js-yaml` is added as a dev dependency.
- Generated `hooks/*.sh` are executable, admin UI apps ship `web-src/.babelrc` with the Babel preset, and the seeded `ext.config.yaml` files match what the 2.0 lib generates.
- `useLazyAppBuilderAction` resolves IMS credentials itself and keeps `invoke` stable across renders.
- `businessConfig.schema` and `webhooks` are no longer empty arrays (the lib rejects them); `hasCommerceWebhooks` renders a `webhook-sample` action built on `@adobe/aio-commerce-lib-webhooks`.
- The preset writes `@parcel/resolver-default.packageExports: true` to the workspace root, which Parcel requires there to resolve `#app.commerce.config`; the app generator merges it into existing roots.
- Custom install steps are TypeScript (`defineCustomInstallationStep`), compiled by a new extensibility `webpack-config.cjs`, and imply the commerce lib. `tsconfig.base.json` uses Bundler resolution. `adminUi.menu.aclProtected` defaults to `true`.
- Dependency pins moved to lib-app ^2.0.0, admin-ui ^1.1.0, lib-config ^1.8.0, Spectrum S2 ^1.8.2, React 19.3, `ts-loader` ^9.6.2 and `@types/node` ^24.12.