# AP21INT-57: TypeScript Config, Infra & nx.json Changes

## 1. TypeScript Config Changes

### 1.1 Unified `tsconfig.json` structure

Every project-level `tsconfig.json` was updated from a minimal stub:

```json
{
    "extends": "@aligent/ts-code-standards/tsconfigs-extend",
    "files": [],
    "include": [],
    "references": []
}
```

to a fully specified config with compiler options and include globs:

```json
{
    "extends": "@aligent/ts-code-standards/tsconfigs-extend",
    "compilerOptions": {
        "baseUrl": ".",
        "rootDir": "src",
        "outDir": "out-tsc",
        "tsBuildInfoFile": "out-tsc/tsconfig.lib.tsbuildinfo",
        "types": ["node"]
    },
    "include": ["src/**/*.ts"],
    "references": [...]
}
```

Key additions across all project tsconfigs:
- `outDir: "out-tsc"` — consistent output directory for incremental build artifacts
- `tsBuildInfoFile` — enables TypeScript's incremental/composite build caching
- `types: ["node"]` — explicit Node.js type inclusion
- `include` globs now explicitly set (previously empty)

### 1.2 Service tsconfigs gained project references

All service `tsconfig.json` files (inventory, orders, persons, products, rewards) added three new project references:

```json
"references": [
    { "path": "../../clients" },
    { "path": "../../libs/runtime" },
    { "path": "../../libs/infra" },
    { "path": "./tsconfig.lib.json" },
    { "path": "./tsconfig.spec.json" }
]
```

Previously they only referenced `tsconfig.lib.json` and `tsconfig.spec.json`. The new references to `clients`, `libs/runtime`, and `libs/infra` make the dependency graph explicit for TypeScript's project references / composite builds.

### 1.3 Library tsconfigs gained `shared-configs` reference

- `libs/runtime/tsconfig.json` — added `{ "path": "../shared-configs" }` reference
- `libs/infra/tsconfig.json` — added `{ "path": "../shared-configs" }` reference

### 1.4 Root tsconfig.json

- Added `{ "path": "./libs/shared-configs" }` to the root project references
- Reordered existing references (clients moved before libs/infra)

### 1.5 Application tsconfig

`application/tsconfig.json` changed from `"files": [], "include": []` to:

```json
"compilerOptions": {
    "baseUrl": ".",
    "outDir": "out-tsc",
    "tsBuildInfoFile": "out-tsc/tsconfig.lib.tsbuildinfo",
    "types": ["node"]
},
"include": ["bin/**/*.ts", "lib/**/*.ts"]
```

Note: no `rootDir` set (unlike other projects), and `include` covers both `bin/` and `lib/`.

### 1.6 Stores tsconfig (minor)

`services/stores/tsconfig.json` — only removed the `"files": []` line; no other changes.

## 2. Infra / CDK Changes

### 2.1 `StoreConfig` type moved to `@libs/shared-configs`

The `StoreConfig` interface was **removed** from `libs/infra/src/configs.ts` and is now imported from `@libs/shared-configs`:

```diff
-export interface StoreConfig {
-    ap21Instance: string;
-    ap21CountryCode: string;
-    adobeCommerceStoreCode: string;
-    adobeCommerceStoreId: number;
-    adobeCommerceWebsiteId: number;
-}
+import type { StoreConfig } from '@libs/shared-configs';
```

`libs/infra/src/index.ts` also updated its import:

```diff
-import { getStageConfigs, StoreConfig } from './configs';
+import type { StoreConfig } from '@libs/shared-configs';
+import { getStageConfigs } from './configs';
```

### 2.2 `application/bin/main.ts` — stricter type assertions

Environment variables cast to `string` explicitly:

```diff
 env: {
-    account: process.env.CDK_DEFAULT_ACCOUNT,
-    region: process.env.CDK_DEFAULT_REGION,
+    account: process.env.CDK_DEFAULT_ACCOUNT as string,
+    region: process.env.CDK_DEFAULT_REGION as string,
 },
```

This satisfies stricter type checking — CDK's `Environment` expects `string`, not `string | undefined`.

### 2.3 Infra test file relocated

```
libs/infra/tests/shared-infra-stack.spec.ts → libs/infra/src/shared-infra.spec.ts
```

Moved from a separate `tests/` directory into `src/`, with the import path adjusted accordingly:

```diff
-import { SharedInfraStack, SharedStackProps } from '../src/index.js';
+import { SharedInfraStack, SharedStackProps } from './index.js';
```

## 3. nx.json Changes

The `typecheck` target configuration was updated:

```diff
 "typecheck": {
-    "cache": false,
-    "inputs": ["default", "^production"]
+    "cache": true,
+    "inputs": ["default", "^production"],
+    "outputs": ["{projectRoot}/out-tsc"]
 },
```

Three changes:
1. **`cache: false` → `cache: true`** — typecheck results are now cached by Nx, avoiding redundant re-checks when inputs haven't changed
2. **`outputs` added** — declares `{projectRoot}/out-tsc` as the output directory, which Nx uses to store/restore cached build artifacts (aligns with the new `outDir: "out-tsc"` in all tsconfigs)
3. These changes work together: the new `outDir`/`tsBuildInfoFile` settings in every tsconfig produce deterministic output in `out-tsc/`, which Nx can then cache and restore via the `outputs` declaration

### Why this matters

Previously, `typecheck` ran from scratch every time (`cache: false`). Now, with TypeScript's incremental `.tsbuildinfo` files stored in `out-tsc/` and Nx caching that directory, subsequent `yarn typecheck` runs skip unchanged projects entirely. This should significantly speed up CI and local development loops.
