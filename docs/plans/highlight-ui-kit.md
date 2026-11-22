# Highlight & Quote Kit — Plan

Goal: highlights + quote cards as shadcn-style registry items. Copy the source,
own it, edit it. Docs at `ui.souravinsights.com`.

## One copy, two apps

`packages/registry` is the only source. Both apps alias it from `tsconfig.json`;
neither keeps an installed copy:

| Alias | Target |
| :--- | :--- |
| `@/components/highlight/*` | `packages/registry/src/highlight` |
| `@/components/quote/*` | `packages/registry/src/quote` |
| `@/components/blocks/*` | `packages/registry/src/blocks` |
| `@/components/ui/*` (custom primitives) | `packages/registry/src/ui` |
| `@/hooks/*`, `@/lib/highlight-*` | `packages/registry/src/hooks`, `.../lib` |

shadcn built-ins (`button`, `popover`, `tooltip`, `dialog`, `tabs`, …) stay
installed per app.

### React versions

The site runs Next 14 + React 18; the kit runs Next 16 + React 19. Yarn 1 would
otherwise hoist one version and nest the other, mixing `@types/react` inside a
single TS program. Two guards keep them apart:

- root `workspaces.nohoist` pins `react`, `react-dom`, `@types/react` and
  `@types/react-dom` inside `kit` and `site`;
- each app maps `react`, `react/*`, `react-dom`, `react-dom/*` to its own
  `@types`, so registry source compiled by that app sees one React.

## The design is locked

The current highlight palette, quote studio, carousel, variant swatches, colour
field/picker, customize panel and footer are final. Refactors may move code,
types, files and callbacks. They may not change DOM structure, classes, timing,
spacing or interaction.

The carousel is especially frozen: same spring, offsets, CSS transition, gap and
wheel listener.

## Current state

| Piece | File | State |
| :--- | :--- | :--- |
| Palette | `src/lib/highlight-palette.ts` | extracted |
| Mark maths | `src/lib/highlight-anchor.ts` | extracted |
| Mark engine | `src/components/highlight/highlight.tsx` | engine, selection, wave hooks |
| Highlight context | `src/components/highlight/highlight-context.ts` | extracted |
| Text selection | `src/hooks/use-text-selection.ts` | extracted |
| Toolbar parts | `src/components/highlight/highlight-toolbar.tsx` | composable exports |
| Highlight rail | `src/components/highlight/highlight-rail.tsx` + `src/components/ui/marker-rail.tsx` | rail extracted, list still local |
| Wave | `src/components/highlight/wave.ts` | extracted |
| Quote studio | `src/components/share-quote/dialog.tsx` | dialog + state |
| Quote card | `src/components/share-quote/quote-card.tsx` | extracted |
| Canvas | `src/components/ui/canvas.tsx` | extracted |
| Quote actions | `src/components/share-quote/actions.tsx` | extracted |
| Design rail | `src/components/share-quote/carousel.tsx` | extracted |
| Quote options | `src/components/share-quote/options.tsx` | extracted |
| Variant picker | `src/components/share-quote/variant-picker.tsx` | extracted |
| Presets | `src/components/share-quote/presets.ts` | extracted |
| Themes + fills | `src/components/share-quote/themes.ts` | extracted |
| Card renderer | `src/components/share-quote/render.ts` | extracted |
| Carousel primitive | `src/components/ui/snap-carousel.tsx` | extracted |
| Selection panel | `src/components/ui/anchored-panel.tsx` + hook | extracted |
| Customize panel shell | `src/components/ui/side-panel.tsx` | extracted |
| Colour field | `src/components/ui/color-field.tsx` | row only |
| Colour picker | `src/components/ui/color-picker.tsx` | wheel/brightness/hex family |
| Inline text field | `src/components/ui/inline-edit-field.tsx` | extracted |
| Hue/variant swatch | `src/components/ui/swatch.tsx` | extracted |
| Controls | `button`, `toggle`, `kbd`, `select`, `label`, `radio-group` | shadcn |

Done in this refactor:

- one shared highlight palette for reader and blog marks
- shadcn `Button`, `Toggle`, `Kbd`, `Swatch`, `Select` states
- palette on Radix `Popover` with a virtual anchor
- customize panel on CSS width/slide, with content fade
- colour picker split from colour field; `Button` used throughout
- variant swatch ring and per-theme variant/override memory
- carousel extracted without changing its DOM, CSS or motion
- mark snapping/cutting moved to `highlight-anchor.ts`
- rail geometry moved to `MarkerRail`
- options panel, variant picker, design rail and footer split from the dialog
- quote card code split into presets, themes and renderer; fills live in themes
- highlight toolbar split into context-backed parts in `highlight-toolbar.tsx`
- selection reading, word snapping and anchor measuring moved to `useTextSelection`
- first `registry.json` manifest with item dependencies
- `Canvas` / `QuoteCard` extracted; the carousel owns card painting
- `shadcn build` generates `public/r/*.json`
- `cards.ts` split into presets, themes and render; fills live with themes

## Remaining foundation work

### 1. Highlights

- The toolbar parts are exported; keep their DOM as the default composition.
- Public mark shape:

```ts
type HighlightMark = {
  id: number;
  quote: string;
  occurrence: number;
  hue: number;
};
```

- Controlled `marks` / `onMarksChange` are implemented; `initialMarks` and the
  persistence callbacks still work for the reader.

- Keep `highlight-rail.tsx` as the highlight-specific list + Notes action over
  `MarkerRail`.

### 2. Quote studio

- `canvas.tsx` and `quote-card.tsx` are extracted; the carousel renders them.
- `dialog.tsx` is the shell + state; `actions.tsx` owns the footer.
- Keep per-theme variant/override state in the dialog.
- The options panel, variant picker and carousel are already separate.

### 3. Registry and docs

- `registry.json` exists and names the libs, hooks and UI items.
- Verified: `highlight` and `quote-share-dialog` install and typecheck in a
  Radix-based blank Next app.
- The kit uses Radix primitives; Base UI projects must initialize with
  `npx shadcn@latest init -b radix`.
- Blocks `article-highlights` and `quote-share` exist.
- `shadcn build` → `public/r/*.json`.
- Docs are on Fumadocs. Hand-written index, installation and examples pages;
  one generated MDX page per registry item. Search and sidebar are Fumadocs'.
- Each item page follows shadcn: a centred `<ComponentPreview>` with the demo
  source behind View Code, Installation with Command and Manual tabs (Steps +
  `<ComponentSource>`), then an authored Usage and any examples.
- Every item has a demo (`src/components/demos/<name>-demo.tsx`); the generator
  reads the demo source and the registry source into `src/generated`.
- Authored Usage and examples live in `scripts/registry-docs.mjs`.

## Naming

| Public name | File |
| :--- | :--- |
| `Highlight` | `highlight.tsx` |
| `HighlightToolbar`, `HighlightActions`, `HighlightColors`, `HighlightList` | `highlight-toolbar.tsx` |
| `useHighlight` | `highlight-context.ts` |
| `HighlightRail` | `highlight-rail.tsx` |
| `MarkerRail` | `marker-rail.tsx` |
| `useTextSelection` | `use-text-selection.ts` |
| `QuoteCard` | `quote-card.tsx` |
| `Canvas` | `canvas.tsx` |
| `QuoteCarousel` | `carousel.tsx` |
| `QuoteVariantPicker` | `variant-picker.tsx` |
| `QuoteOptions` | `options.tsx` |
| `ShareQuoteDialog` | `dialog.tsx` |
| `ColorField`, `ColorPicker` | existing |
| `SnapCarousel`, `SidePanel`, `AnchoredPanel`, `Swatch` | existing |

No `XRoot`, no invented verbs. One component family per file.

## Rules

- Radix owns state: `data-highlighted`, `data-state`, focus-visible only.
- Design tokens own colour and radius. No arbitrary chrome colours.
- One control radius: `rounded-md`; menu items `rounded-sm`; swatches full;
  modal shell `14px`.
- Text tiers: `foreground` title, `foreground/85` labels,
  `muted-foreground` values, `faint-foreground` metadata.
- No visual change during extraction. If a move needs a class change, stop.
- Files are kebab-case; exports PascalCase. One family per file.
- Forward refs where a primitive wraps a DOM node; add `data-slot`.
- Use named slots (`actions`) instead of layout-specific props.

## Non-goals

- No carousel rewrite.
- No new typography scale.
- No custom lint framework.
- No adapter for editors or extra themes until a real consumer asks.
