# Monorepo Plan

Personal site, not a SaaS. The names should read like a site and a kit, not a
company.

## Why now

The registry and its docs are about to become a second deployable surface.
Splitting after the docs exist means moving the docs, the registry build and
the Vercel project later. Do it now, before `ui.souravinsights.com` has content.

## Layout

```text
apps/
  site/        souravinsights.com — the personal site, blog, insights, books
  kit/         ui.souravinsights.com — the component docs + /r registry

packages/
  registry/    the copy-paste source, registry.json, build script
```

Names:

- `site`, not `web`.
- `kit`, not `ui-docs` or `docs-site`. It is the Highlight & Quote Kit.
- `registry`, not `ui` or `components`; it is the source registry shadcn reads.

No `packages/config` until both apps need the same config. No `packages/ui`
until there is a second consumer of the same compiled components.

## Workspace tooling

- Keep Yarn 1 workspaces. Do not migrate package managers in the same change.
- Turborepo at the root.
- Root scripts: `dev`, `dev:site`, `dev:kit`, `build`, `lint`, `typecheck`.
- Each app owns its `next.config`, Tailwind config and `tsconfig`.
- The registry package owns the source files, `registry.json` and the build
  command that writes `apps/kit/public/r`.

```text
package.json          workspaces + turbo scripts
turbo.json
apps/site/
apps/kit/
packages/registry/
```

## Registry flow

```text
packages/registry/registry.json
        │
        │ shadcn build
        ▼
apps/kit/public/r/*.json
        │
        ▼
https://ui.souravinsights.com/r/<item>.json
```

- `registry.json` lives with the source.
- Custom dependencies use full URLs:
  `https://ui.souravinsights.com/r/canvas.json`.
- The docs app imports demos from the registry package through a workspace alias,
  or copies at build time. Pick one; do not keep two source copies.

## Vercel

Two projects from one repo:

| Domain | Root | Build |
| :--- | :--- | :--- |
| `souravinsights.com` | `apps/site` | `turbo run build --filter=site` |
| `ui.souravinsights.com` | `apps/kit` | `turbo run build --filter=kit` |

Move `ui.souravinsights.com` from the site project to the kit project once the
kit app exists. The `/r/*` endpoint must live on the same host the registry URLs
point to.

## Phases

1. **Skeleton.** Done: root workspaces + turbo; the current app lives in
   `apps/site` and builds from there. Vercel root is `apps/site`.
2. **Kit app.** Done: `apps/kit` is a Vercel project rooted at `apps/kit`, and
   `ui.souravinsights.com` aliases its production deployment. The site project
   no longer serves that host.
3. **Registry package.** Done: source lives in `packages/registry`, the site maps
   its old aliases there, and `yarn registry:build` writes
   `apps/kit/public/r`. The site's Tailwind config scans the package.
4. **Docs.** Done on Fumadocs: index, installation, examples and generated item
   pages. Every item has a demo, a Usage snippet and a copyable source. The
   sidebar is flat: Components, Blocks, Utilities.

## Deploy

Two Vercel projects, both on the `souravinsights-projects` team:

| Project | Domain | Root | Environment |
| :--- | :--- | :--- | :--- |
| `souravinsights-com` | `www.souravinsights.com` | `apps/site` | Production branch |
| `souravinsights-kit` | `ui.souravinsights.com` | `apps/kit` | Production branch |

Both build from the repo root install (Yarn workspaces) and only their app's
`build` script. The kit's build runs `node scripts/generate-docs.mjs && next
build`, so `apps/kit/public/r` must be committed; `src/generated` and
`content/docs/{components,blocks,utilities}` are regenerated and ignored.

Both projects stay git-connected. Making the deploys fast (pnpm, filtered
installs, an ignored build step) is planned in `docs/plans/deployment.md`.

## Risks

- Moving the Next app breaks aliases, `public/`, MDX content paths and
  `predev`/`prebuild` scripts. Do it as one mechanical move, no feature edits.
- Vercel root/build settings are part of the change. Test a preview deployment.
- Registry source shared by two apps needs Tailwind content and TS path setup.
  Do not leave a duplicated copy.

## Non-goals

- No pnpm/Turborepo migration plus app refactor in one commit.
- No shared component library npm package; the registry is copy-paste.
- No docs app before the monorepo root builds.
