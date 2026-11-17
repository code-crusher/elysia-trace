# Investigation: #1962 — Next.js `next.revalidate` / `next.tags` through Eden Treaty

## Status

**Not reproducible; the requested capability already exists.** Nothing in
`elysiajs/elysia` needs to change. Eden Treaty already forwards arbitrary
`RequestInit` options — including Next.js's `next` field — to the internal
`fetch()` call, both per-call and at the client level. The Eden client is not
part of this repository at all.

## Where the client actually lives

`elysiajs/elysia` ships the server only. No Eden/Treaty implementation has ever
existed on any ref of this repo:

```
$ git rev-list --all --objects | awk '{print $2}' | grep -iE '(^|/)(eden|treaty)'
test/types/eden-422-gate.ts
test/types/eden-route-tree.ts
```

Both hits are type-level tests over `~Routes`, not the client. There is no
`edenTreaty`, `treaty`, `config.fetcher` or `$fetch` anywhere under `src/`
across all 2573 commits. The client is published from
[elysiajs/eden](https://github.com/elysiajs/eden).

## Reproduction attempt

`elysia@1.4.31` (identical to this tree — `git diff 1.4.31 HEAD` is empty),
`@elysiajs/eden@1.4.9` (the version current when the issue was filed),
`next@16.4.6` / `next@15.5.29`, Bun 1.4.4, using the issue's exact snippets.

Next.js declares the augmentation as a plain global merge, which is why it
composes with Eden's `RequestInit` parameters:

```ts
// next/types/global.d.ts
interface NextFetchRequestConfig {
    revalidate?: number | false
    tags?: string[]
}

interface RequestInit {
    next?: NextFetchRequestConfig | undefined
}
```

### Type level — works

```ts
import { treaty } from '@elysiajs/eden'
import type { app } from './server'

// per-call (issue snippet 1)
const { data } = await treaty<typeof app>('localhost:3000')
    .videos({ id: '1' })
    .get({ fetch: { next: { revalidate: 3600 } } })

// client-level (issue snippet 2)
const api = treaty<typeof app>('localhost:3000', {
    fetch: { next: { revalidate: 3600 } }
})

// next.tags, plain RequestInit `cache`, and POST all work too
await api.videos({ id: '1' }).get({
    fetch: { next: { revalidate: 60, tags: ['videos'] }, cache: 'force-cache' }
})
await api.videos.post({ title: 'a' }, { fetch: { next: { tags: ['videos'] } } })
```

`tsc` under a stock Next `tsconfig.json` (`include: ["next-env.d.ts", "**/*.ts"]`,
`moduleResolution: "bundler"`, `skipLibCheck: true`): **exit 0** on both Next 15
and Next 16.

Negative control — the same file with Next's types removed from the program
(`"types": ["bun"]`) fails as expected, proving the augmentation is what makes
it compile and that Eden is not silently accepting anything:

```
issue.ts(7,18): error TS2353: Object literal may only specify known properties,
  and 'next' does not exist in type 'RequestInit'.
```

This is the intended design: Eden types its option bag as `RequestInit`, so any
framework that augments `RequestInit` is supported automatically, without Eden
enumerating `next` itself.

### Runtime level — works

Next.js patches `globalThis.fetch`; Eden's default fetcher *is* the global
fetch (`fetcher = fetch` / `config.fetcher ?? fetch`). Stubbing the global the
way Next does and recording what Eden passes:

```
per-call next : {"revalidate":3600}
config   next : {"revalidate":60,"tags":["videos"]}
next+cache    : {"next":{"tags":["x"]},"cache":"force-cache"}
```

Eden's `fetch(url, { method, body, ...config.fetch, ...options.fetch, headers })`
spread means `next` is handed to the patched fetch untouched, and header
merging is independent of it.

The same holds for the older `edenTreaty` (v1) entry point, which exposes the
option as `$fetch` — per-call (`$fetch` in the params arg) and client-level
(`edenTreaty(url, { $fetch })`). Every published 1.4.x release declares it
(`fetch?: RequestInit` in `treaty2`, `$fetch?: RequestInit` in the v1
`Config`), so this was already true when the issue was filed.

## Corroboration

The maintainer's reply on the issue points at the documented option:
[eden/treaty/config.html#fetch](https://elysiajs.com/eden/treaty/config.html#fetch) —
"Default parameters appended to the 2nd parameter of fetch extend the type of
Fetch.RequestInit."

## Adjacent finding (out of scope for this repo)

`edenFetch`'s `Config extends RequestInit`, but its runtime only reads
`fetcher` and `throwHttpError` from `config` — it builds `init` from the
per-call options alone and never spreads the rest of `config` into it. So
`edenFetch(url, { next: { revalidate: 3600 } })` type-checks yet the `next` is
dropped (observed: `undefined`), while the per-call form works. That is a real
type/runtime mismatch, but it lives in `elysiajs/eden`, not here; it should be
filed/fixed in that repository. It does not affect Treaty `.get()`/`.post()`,
which is what this issue asks about.

## Verification

No source was changed. Full suite on this tree, after `bun run build` (the
node tests import the built `dist`):

- `bun test ./test` — 1709 pass, 2 skip, 0 fail (137 files)
- `bun run test:imports` — pass
- `tsc --project tsconfig.test.json` — clean
- `bun run test:node` — CJS and ESM both pass
