# Investigation: #1963 — @elysia/openapi@2.0.0-beta.1 fails to resolve typebox under Bun

## Status

Bug confirmed and reproduced, but **not fixable in this repository** — the
defective code is not in elysiajs/elysia. It ships from the separate plugin
repository [elysiajs/elysia-openapi](https://github.com/elysiajs/elysia-openapi),
and the fix has already landed there and been published. This document records
the evidence.

## Reproduction

Minimal project, exactly as in the issue (Bun 1.4.4):

```json
{
  "dependencies": {
    "@elysia/openapi": "2.0.0-beta.1",
    "elysia": "2.0.0-beta.4"
  }
}
```

```ts
import openapi from '@elysia/openapi'
import { Elysia } from 'elysia'

new Elysia().use(openapi())
```

```
$ bun run repro.ts
error: Cannot find module '../node_modules/typebox/build/type/script/script.mjs'
from 'node_modules/@elysia/openapi/dist/gen/index.mjs'
```

Identical error to the issue. Also reproduced via `npm pack` of the published
tarball, whose first lines are:

```js
// dist/gen/index.mjs (in @elysia/openapi@2.0.0-beta.1)
import { Script } from "../node_modules/typebox/build/type/script/script.mjs";
import "../node_modules/typebox/build/type/index.mjs";
```

## Root cause

The `@elysia/openapi` 2.0 line is built with `tsdown` in *unbundle* mode. At
the time beta.1 was published (tag `a4d59ec`, July 30 2026, in
elysiajs/elysia-openapi), the `build.ts` did not mark dependencies as
non-bundlable, so tsdown resolved `import { Script } from 'typebox/type'` to
its **build-machine file path** and emitted that as a relative import.
`typebox` is a devDependency of the plugin and is never installed inside
`@elysia/openapi/dist`, so the emitted path
(`dist/gen/../../node_modules/...` → `@elysia/openapi/dist/node_modules/...`)
cannot resolve in any consumer's node_modules layout. It is not a Bun bug, and
not an elysia core bug.

## The fix (already shipped)

elysiajs/elysia-openapi commit `8cef095` (Sept 2, 2026, `:wrench: fix: build`)
added to `build.ts`:

```ts
deps: {
    neverBundle: true
}
```

which makes tsdown emit bare imports (`import { Script } from "typebox/type"`)
that resolve through the consumer's node_modules. Verified:

- `@elysia/openapi@2.0.0-beta.2` → `import { Script } from "typebox/type"`,
  repro passes (`OK: openapi plugin loaded`)
- `@elysia/openapi@2.0.0-rc.1` (latest) → same, repro passes
- Rebuilding the plugin's current `kiana` branch locally with the same config
  produces the correct bare import in both ESM and CJS output

## Why no change belongs in this repo

- `@elysia/openapi` source (including `src/gen/index.ts`, the file that imports
  `typebox/type`) exists in no branch of elysiajs/elysia — verified across all
  local and remote branches (main, kiana, weirs, next, and 20+ others).
- elysia core 2.0.0-beta.4's own dist output has no equivalent
  build-machine-relative imports (its `node_modules` string occurrences are
  all runtime path handling, not imports).
- The published plugin `package.json` declares only `peerDependencies`
  (`elysia`, `typebox`); with `neverBundle: true` the emitted bare imports
  resolve correctly against those peers.

## Resolution for users

Upgrade the plugin:

```sh
bun add @elysia/openapi@latest
```

Any `>=2.0.0-beta.2` contains the fix.

<!-- I have nothing but my burger and I want nothing more -->
