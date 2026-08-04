# vite-plugin-handler

## Sourcemap Warning Fix

When bundling with `@aligent/vite-plugin-handler`, the following warning is emitted:

```
[plugin handler-bundle] [SOURCEMAP_BROKEN] Sourcemap is likely to be incorrect:
a plugin (handler-bundle) was used to transform files, but didn't generate a
sourcemap for the transformation.
```

### Root Cause

In `handler-bundle.js`, the `renderChunk` hook prepends shim statements to the output code but returns only `{ code }` without a `map` property:

```js
// handler-bundle.js:186-191
renderChunk(code) {
    const matched = activeShims.filter(s => s.needles.some(n => code.includes(n)));
    if (matched.length === 0) return null;
    return { code: `${matched.map(s => s.statement).join('\n')}\n${code}` };
},
```

Rolldown expects any plugin that transforms code to also return a sourcemap.

### Solutions

#### Option 1: Proper sourcemap with MagicString (recommended)

Generates an accurate sourcemap that accounts for prepended lines. Debugger breakpoints and stack traces will point to the correct original lines.

```js
import MagicString from 'magic-string';

renderChunk(code) {
    const matched = activeShims.filter(s => s.needles.some(n => code.includes(n)));
    if (matched.length === 0) return null;

    const prefix = matched.map(s => s.statement).join('\n') + '\n';
    const ms = new MagicString(code);
    ms.prepend(prefix);
    return { code: ms.toString(), map: ms.generateMap({ hires: true }) };
},
```

#### Option 2: Return `map: null` (quick fix)

Silences the warning but sourcemap line numbers will be off by the number of prepended shim lines.

```js
renderChunk(code) {
    const matched = activeShims.filter(s => s.needles.some(n => code.includes(n)));
    if (matched.length === 0) return null;
    return {
        code: `${matched.map(s => s.statement).join('\n')}\n${code}`,
        map: null,
    };
},
```

## Minification

At the moment, we're minifying on Production only. Considering disabling `minify` across all environments.

```js
build: {
  license: false,
  outDir: "dist/".concat(entryName),
  minify: mode !== 'development' ? 'oxc' : false,
  sourcemap: mode !== 'production',
  ...
}
```

### Justification for disabling minification & sourcemap

Minification provides negligible benefit for Lambda:

- **Cold start**: Lambda cold start is dominated by runtime init, network, and dependency loading — not JS parsing. Shaving a few KB off bundle size won't measurably change it.
- **Bundle size**: Lambda has a 250MB unzipped limit. Typical service bundles are nowhere near that, so the size reduction is trivial.
- **Debugging**: Minified code makes CloudWatch stack traces and error logs harder to read, even with sourcemaps. Disabling minify means stack traces point directly to readable code.
- **Consistency**: Having different bundle shapes per environment can mask bugs. Disabling minify everywhere removes that variable.

Sourcemaps are unnecessary in production when code is not minified:

- **Readable stack traces by default**: Without minification, CloudWatch error logs and stack traces already reference readable function names and line numbers from the bundled output — sourcemaps add little value.
- **Reduced artifact size**: Sourcemap files can be larger than the bundle itself. Skipping them in production reduces the Lambda deployment package size and S3 storage.
- **No debugging tooling in prod**: Sourcemaps are consumed by debuggers and browser devtools. In a Lambda production environment, neither is attached — the maps are generated, uploaded, and never read.

### Proposed change

Hardcode `minify: false` and gate `sourcemap` on `NODE_ENV`:

```js
minify: false,
sourcemap: process.env.NODE_ENV !== 'production',
```

Drop the `BUNDLE_MODE` because Vite already sets mode to "production" by default when running `vite build` without `--mode`. We switch to `NODE_ENV` in the command

```bash
NODE_ENV=development yarn build
```
