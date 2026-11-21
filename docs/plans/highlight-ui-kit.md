# Highlight & Quote Kit — Plan

Goal: highlights + quote cards as shadcn-style registry items. Copy the source,
own it, edit it. Docs at `ui.souravinsights.com`.

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
| Mark engine + palette UI | `src/components/highlight/highlight.tsx` | monolith |
| Highlight rail | `src/components/highlight/HighlightTicks.tsx` + `src/components/ui/marker-rail.tsx` | rail extracted, list still local |
| Wave | `src/components/highlight/wave.ts` | extracted |
| Quote studio | `src/components/share-quote/dialog.tsx` | dialog, state, footer |
| Design rail | `src/components/share-quote/carousel.tsx` | extracted |
| Quote options | `src/components/share-quote/options.tsx` | extracted |
| Variant picker | `src/components/share-quote/variant-picker.tsx` | extracted |
| Card renderer/themes | `src/components/share-quote/cards.ts` | 810-line monolith |
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
- quote customizer, variant picker and design rail split from the dialog

## Remaining foundation work

### 1. Highlights

- Split `highlight.tsx` internally:
  `Highlight`, `HighlightToolbar`, `HighlightColors`, `HighlightActions`,
  `HighlightCopy`, `HighlightShare`, `HighlightLink`, `HighlightRemove`,
  `HighlightList`.
- Extract selection reading into `use-text-selection.ts`.
- Public mark shape:

```ts
type HighlightMark = {
  id: string;
  quote: string;
  occurrence: number;
  hue: string;
};
```

- Rename `HighlightTicks.tsx` to `highlight-rail.tsx` and keep it as the
  highlight-specific list + Notes action over `MarkerRail`.

### 2. Quote studio

- Split `cards.ts` into:
  - `quote-render.ts` — `drawCard`, `cardToBlob`, `resolveOptions`
  - `quote-themes.ts` — `THEMES`, `ShareTheme`, `Variant`
  - `quote-presets.ts` — modes, fonts, size/align/position
  - `quote-paint.ts` — `Paint`, `solid`, `mesh`, swatch helpers
- Extract `canvas.tsx` and `quote-card.tsx`.
- Split the remaining `ShareQuote.tsx` into:
  - `share-quote-dialog.tsx` — shell, state, export actions
- Keep per-theme variant/override state in the dialog.
- The options panel and variant picker are already separate.

### 3. Registry and docs

- `registry.json` points at the existing source.
- `shadcn build` → `public/r/*.json`.
- Blocks: `article-highlights`, `quote-share`.
- Docs: minimal article, custom toolbar, persisted marks, quote card only.

## Naming

| Public name | File |
| :--- | :--- |
| `Highlight`, `HighlightToolbar`, … | `highlight.tsx` |
| `HighlightRail` | `highlight-rail.tsx` |
| `MarkerRail` | `marker-rail.tsx` |
| `useTextSelection` | `use-text-selection.ts` |
| `QuoteCard` | `quote-card.tsx` |
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

## Non-goals

- No carousel rewrite.
- No new typography scale.
- No custom lint framework.
- No adapter for editors or extra themes until a real consumer asks.
