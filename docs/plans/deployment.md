# Deployment Plan

Status: done on `work/deploy-speedup`. Both apps run Next 16 (Turbopack) +
React 19 on bun.

## Before

| | Site | Kit |
| :--- | ---: | ---: |
| install | 146s | 171s |
| compile | 143s (webpack) | 23s (Turbopack) |
| **total** | **7m** | **3.7m** |

## After

Local (cold): both apps build in 32.5s; site compile 143s → 9.9s.

Vercel (preview, build cache warm):

| | Site | Kit |
| :--- | ---: | ---: |
| install (`bun --filter`) | 0.6s | 0.6s |
| compile (Turbopack) | 10s | 7s |
| full build | 54s | 18s |
| **deploy** | **75s** | **26s** |

A push that touches neither app is skipped on both projects. The build
machine is Vercel Hobby's 2 cores / 8 GB, so the remaining site time is
CPU-bound SSG and page collection, not the toolchain.

### What changed

### bun replaces Yarn 1

Yarn 1 re-linked the whole workspace on every deploy and forced `nohoist` to
keep the two React majors apart. Both apps are React 19 now, so hoisting is
safe; bun installs much faster and needs neither `nohoist` nor the tsconfig
`react` path mappings. `pnpm-workspace.yaml`, `yarn.lock` and the `pnpm` block
are gone; `bun.lock` and `workspaces` in the root `package.json` remain.

### Next 16 + Turbopack on the site

Next 16 compiles the site with Turbopack: 143s → 10s. Migrations:

- `cookies()` / `headers()` awaited (routes, `admin-auth`, `login` action).
- `params` / `searchParams` are promises in pages, metadata and
  `opengraph-image`.
- `revalidateTag(tag)` → `revalidateTag(tag, "max")`.
- `experimental.serverComponentsExternalPackages` → `serverExternalPackages`.
- `experimental.outputFileTracingIncludes` → top-level.
- `experimental.instrumentationHook` dropped (stable).
- `images.domains` → `remotePatterns`.
- `staleTimes` stays under `experimental`.
- `middleware.ts` → `proxy.ts` (`export function proxy`).
- `next/dynamic` with `ssr: false` moved into client wrappers
  (`PostHogPageViewClient`, `PlaygroundClient`); server components may not use
  it.
- `@next/mdx` removed: it was dead config (posts load through
  `next-mdx-remote` at runtime) and its function options are not serializable
  under Turbopack.
- `@dnd-kit/dom` declared; `@types/react` added to the registry so it stops
  resolving types from outside the repo.

### One build per push

Each app has a `vercel.json`:

- `installCommand`: `bun install --frozen-lockfile --filter <app>` — installs
  one workspace (site 1213 packages, kit 528) instead of all 1401.
- `buildCommand`: `bun run build` — the app's own script, so turbo is not in
  the deploy path.
- `ignoreCommand`: diffs `apps/<app>` + `packages/registry` from the repo root
  and skips when nothing changed.

A registry change rebuilds both; anything else builds one.

## Vercel

Two projects, both git-connected, both on bun:

| Project | Domain | Root |
| :--- | :--- | :--- |
| `souravinsights-com` | `www.souravinsights.com` | `apps/site` |
| `souravinsights-kit` | `ui.souravinsights.com` | `apps/kit` |

## Remaining

- A larger build machine (Pro) is the only lever left for the site's 44s of
  SSG/collection work; on Hobby the machine is fixed at 2 cores.
- Watch a cold deploy (no build cache) to confirm the cold install is still
  well under the old 146–171s.
