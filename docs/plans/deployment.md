# Deployment Plan

Status: done on `work/deploy-speedup`. Both apps run Next 16 (Turbopack) +
React 19 on bun.

## Before

| | Site | Kit |
| :--- | ---: | ---: |
| install | 146s | 171s |
| compile | 143s (webpack) | 23s (Turbopack) |
| **total** | **7m** | **3.7m** |

## After (local, cold)

| | |
| :--- | ---: |
| both apps build | **32.5s** |
| site compile | **9.9s** |
| site SSG (62 pages) | 20.1s |
| kit build | 10.8s |
| warm `bun install` | 43ms |

## What changed

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

Each app has a `vercel.json` with an ignored build step that runs from the repo
root and skips when neither the app nor `packages/registry` changed. A registry
change rebuilds both.

## Vercel

Two projects, both git-connected, both on bun:

| Project | Domain | Root |
| :--- | :--- | :--- |
| `souravinsights-com` | `www.souravinsights.com` | `apps/site` |
| `souravinsights-kit` | `ui.souravinsights.com` | `apps/kit` |

## Remaining

- Confirm a preview deploy uses bun and honours the ignored build step.
- Time one deploy per project end to end on Vercel.
