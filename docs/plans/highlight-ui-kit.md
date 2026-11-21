# Highlight & Quote Kit — Component Architecture

Goal: highlights + quote cards as **shadcn-style registry items**. Copy the source,
own it, edit it. Docs at `ui.souravinsights.com`.

Scope: highlight engine, highlight rail, quote card + share studio.

## Naming rules (what shadcn actually does)

- A component family lives in **one file**: `dialog.tsx` has `Dialog`,
  `DialogTrigger`, `DialogContent`; `select.tsx` has the whole family. Do not split
  every subcomponent into its own file.
- The root is a **plain noun**: `Dialog`, `Sheet`, `Sidebar`, `Chart`, `Field`,
  `Item`. Not `XRoot`, not `XProvider` unless it is explicitly a provider.
- Subparts are **role suffixes**: `Trigger`, `Content`, `Item`, `Header`, `Footer`,
  `Group`, `List`, `Action`.
- Modifiers are allowed when they describe the concept: `InputGroup`,
  `ButtonGroup`, `ToggleGroup`, `AspectRatio`, `ScrollArea`, `ResizablePanel`.
- File name = primary export in kebab-case: `snap-carousel.tsx`,
  `color-field.tsx`.
- Hooks are `use-*.ts`. Libs are noun `.ts`, no components.

## Pre-flight audit: current code vs shadcn

No. The quote dialog is mostly native; the highlight surface is not. That has to
be normalized before extraction, or we publish the old shape and rewrite it later.

Already native:

- `ShareQuote`: Radix `Dialog`, shadcn `Button`, `Label`, `RadioGroup`,
  `Select`, `Separator`, `Switch`, `Tabs`, `Textarea`.
- `HighlightRail` (current `HighlightTicks`): Radix `Popover` and `Tooltip`.
- `InlineEditField` (current `TextRow`): shadcn `Button`, `Textarea`, `Switch`,
  `Label`.
- `Choice`: shadcn `Select`. No wrapper needed.

Hand-rolled, replace:

| Where | Now | Should be |
| :--- | :--- | :--- |
| highlight actions, `highlight.tsx:772–812` | raw `<button>` | shadcn `Button variant="ghost" size="sm"`, grouped with `ButtonGroup` |
| highlight colours, `:817–845` | `<fieldset>` + `<button aria-pressed>` | `RadioGroup` / `SwatchGroup` + `Swatch` |
| highlight list, `:859–880` | raw `<button>` rows | `Button variant="ghost"` with `data-active`, or `Item` family |
| palette shell, `:753–768` | absolute `motion.div` + hand-written placement | `AnchoredPanel` built on Radix `Popover` + `PopoverAnchor virtualRef` + `PopoverContent`; Radix owns collision, arrow, dismiss |
| palette animation | framer-motion + `AnimatePresence` | Radix `data-state` + `animate-in` / `animate-out` |
| quote footer, `share-quote-dialog.tsx:666–727` | raw `<button>` | `Button` (`ghost`, `secondary`, default); `Toggle` for Customize |
| shortcuts, `:707,724` | raw `<kbd>` | shadcn `Kbd` |
| colour swatches, `:823–866` | raw `<button>` | `SwatchGroup` + `Swatch` |
| custom colour input, `:868` | raw `<input type="color">` | keep the native input (no Radix equivalent), wrapped by `ColorField` |
| reset link, `:1039` | raw `<button>` | `Button variant="ghost" size="sm"` |
| carousel, `:471–482` | `qs-*` classes, raw `<style>` | `SnapCarousel` data attributes + Tailwind `snap-*`; no global class names |
| carousel slides, `:587–619` | `<div role="group" onClick>` | `SnapCarouselItem` wrapping a real `Button` / `Toggle`, with `aria-current` |
| rail trigger/list, `highlight-rail.tsx:66,126,142` | raw `<button>` | `Button variant="ghost"`; ticks stay spans inside it |
| `reader-kern-off`, `highlight.tsx:750` | injected global `<style>` | inline `fontKerning` / `fontVariantLigatures` on the paragraph |
| `LIFT`, `highlight.tsx:751` | hard-coded shadow | Tailwind `shadow-lg` / `shadow-xl` |
| `type-caption`, 5 uses | site token | `text-xs` / `text-[13px]` |
| `faint-foreground`, `highlight-rail.tsx:75,108` | site token | `muted-foreground` with opacity |

Hand-rolled, justified (no shadcn/Radix equivalent):

- DOM mark locating and text wrapping (`Range`, `TreeWalker`). This is the engine.
- Wave animation (`WAAPI` on character spans).
- Canvas rendering, DPR, export (`Canvas`, `drawCard`).
- Selection reading and word snapping (`useTextSelection`).
- `MarkerRail` geometry. Layout only; its tooltip/popover are Radix.
- Inline mark as `role="button"` span. A real `<button>` is possible but changes
  inline layout; document the a11y contract instead.
- Native colour input. The browser owns it.
- Carousel spring. Embla cannot reproduce it without replacing the interaction;
  keep it as a custom primitive, not as a fake Radix component.

Rules from here:

1. If shadcn has it, use it: `Button`, `Toggle`, `ToggleGroup`, `Kbd`, `Field`,
   `ButtonGroup`, `RadioGroup`, `Item`, `Popover`, `Tooltip`, `Dialog`.
2. Radix owns behaviour; Tailwind tokens own skin. No global `qs-*`/`reader-*`
   classes.
3. Animate with `data-state` + shadcn animation utilities. No framer-motion in
   registry items.
4. Only hand-roll where no primitive exists; document why in the file header.
5. Every raw HTML control needs a written reason if it survives.

## Revised names

| Ours | File | Rejected | Why |
| :--- | :--- | :--- | :--- |
| `Highlight` | `highlight.tsx` | `HighlightRoot`, `Highlighter` | shadcn roots are nouns; the whole family (toolbar, colors, actions, list) lives here like `select.tsx` |
| `HighlightRail` | `highlight-rail.tsx` | `HighlightTicks` | “ticks” is the implementation; the thing is a rail of markers |
| `SnapCarousel` | `snap-carousel.tsx` | `Carousel` | must not overwrite shadcn's `carousel.tsx`; modifier+noun like `InputGroup` |
| `SnapCarouselContent` | same | `SnapCarouselViewport` | shadcn Carousel calls the scroll area `CarouselContent` |
| `SnapCarouselItem` | same | — | same pattern as `CarouselItem` |
| `AnchoredPanel` | `anchored-panel.tsx` | `FloatingPanel`, `SelectionPopover` | says what it does; `[Modifier]Panel` like `ResizablePanel` |
| `SidePanel` | `side-panel.tsx` | `RevealPanel`, `PushPanel` | says where it is; no invented verb |
| `Canvas` | `canvas.tsx` | `CanvasStage` | wraps `<canvas>` the way `Table` wraps `<table>`; “stage” is product jargon |
| `Swatch` / `SwatchGroup` | `swatch.tsx` | `ColorDot` | noun + group, like `RadioGroup` |
| `ColorField` | `color-field.tsx` | `ColorPicker` | it is an inline field, not a popover; fits `Field` family |
| `InlineEditField` | `inline-edit-field.tsx` | `TextRow` | describes the control, not the row |
| `MarkerRail` | `marker-rail.tsx` | `TickRail` | data is markers; `SidebarRail` already establishes “rail” |
| `QuoteCard` | `quote-card.tsx` | — | |
| `QuoteCarousel` | `quote-carousel.tsx` | — | |
| `QuoteVariantPicker` | `quote-variant-picker.tsx` | — | `Picker` suffix like `DatePicker` |
| `QuoteCustomizer` | `quote-customizer.tsx` | `QuoteCustomizePanel` | it is a widget; the `SidePanel` around it is layout |
| `ShareQuoteDialog` | `share-quote-dialog.tsx` | — | `CommandDialog` precedent: noun + `Dialog` |
| `useTextSelection` | `use-text-selection.ts` | — | |
| `useAnchoredPanel` | `use-anchored-panel.ts` | — | part of the `anchored-panel` item |

Dropped from the public API:

- `useScrolled`: a local sticky-header detail, not a primitive.
- `Row`, `Choice`: `Label` + `Select` already exist.
- `HighlightCopy`, `HighlightShare`, `HighlightRemove`, `HighlightLink` keep those
  names, no `Button` suffix — shadcn uses `DropdownMenuItem`, not `ItemButton`.

## File tree

```text
src/lib/
  highlight-palette.ts            registry:lib  highlight-palette
  highlight-anchor.ts             registry:lib  highlight-anchor
  highlight-wave.ts               registry:lib  highlight-wave
  quote-paint.ts                  registry:lib  quote-paint
  quote-presets.ts                registry:lib  quote-presets
  quote-themes.ts                 registry:lib  quote-themes
  quote-render.ts                 registry:lib  quote-render

src/hooks/
  use-text-selection.ts           registry:hook use-text-selection
  use-anchored-panel.ts           registry:hook anchored-panel (same item)

src/components/ui/
  snap-carousel.tsx               registry:ui  snap-carousel
  anchored-panel.tsx              registry:ui  anchored-panel
  side-panel.tsx                  registry:ui  side-panel
  canvas.tsx                      registry:ui  canvas
  swatch.tsx                      registry:ui  swatch
  color-field.tsx                 registry:ui  color-field
  inline-edit-field.tsx           registry:ui  inline-edit-field
  marker-rail.tsx                 registry:ui  marker-rail

src/components/highlight/
  highlight.tsx                   registry:ui  highlight
  highlight-rail.tsx              registry:ui  highlight-rail

src/components/quote/
  quote-card.tsx                  registry:ui  quote-card
  quote-carousel.tsx              registry:ui  quote-carousel
  quote-variant-picker.tsx        registry:ui  quote-variant-picker
  quote-customizer.tsx            registry:ui  quote-customizer
  share-quote-dialog.tsx          registry:ui  share-quote-dialog

src/components/blocks/
  article-highlights.tsx          registry:block article-highlights
  quote-share.tsx                 registry:block quote-share
```

`highlight.tsx` exports the whole family:

```ts
Highlight
HighlightToolbar
HighlightColors
HighlightActions
HighlightCopy
HighlightShare
HighlightRemove
HighlightLink
HighlightList
```

`quote-card.tsx` exports `QuoteCard`; `quote-render.ts` exports `drawCard`,
`cardToBlob`, `resolveOptions`. Component and lib share the concept, not the
basename, so imports read clearly.

## Generic primitives

### SnapCarousel

```tsx
<SnapCarousel value={themeId} onValueChange={setThemeId} gap={29}>
  <SnapCarouselContent aria-label="Styles">
    <SnapCarouselItem value={theme.id} className="w-[220px]">
      <QuoteCard ... />
    </SnapCarouselItem>
  </SnapCarouselContent>
</SnapCarousel>
```

- `SnapCarousel` owns the spring glide, wheel stepping, drag guard, nearest-centre
  detection.
- `SnapCarouselContent` is the scroll rail.
- `SnapCarouselItem` exposes `data-state="active|before|after"` for the peek.
- No Embla. Shadcn's `Carousel` stays installable alongside it.

### AnchoredPanel

```tsx
<AnchoredPanel open={open} anchor={rangeRect} sideOffset={12} arrow>
  <HighlightToolbar />
</AnchoredPanel>
```

- `anchor` is any viewport `DOMRect`.
- Converts to document coordinates so the panel rides the page.
- Flips above/below, clamps to the viewport, exposes `data-side` and
  `--anchor-x` for the arrow.
- `preserveSelection` prevents pointerdown from collapsing a text selection.
- `useAnchoredPanel` is exported for custom markup.

### SidePanel

```tsx
<SidePanel open={customize} side="left" width={288} overlayBelow="lg">
  <QuoteCustomizer />
</SidePanel>
```

- Desktop: width animates from 0.
- Below `overlayBelow`: translates over the stage.
- CSS-only breakpoint; the old JS `matchMedia` branch was the hydration bug.
- `inert` when closed; `data-state="open|closed"`.
- Not `Sheet`: no modal, no focus trap.

### Canvas

```tsx
<Canvas
  width={1080}
  height={1920}
  deps={[theme, variant, options]}
  draw={(ctx, { scale }) => drawCard(ctx, mode, theme, options)}
/>
```

- Measures its box, sets backing size at DPR (cap 2), redraws on resize and deps.
- `QuoteCard` is `Canvas` + `drawCard`.
- No other component draws canvas.

### Swatch / SwatchGroup

```tsx
<SwatchGroup value={hue.name} onValueChange={pick} label="Highlight colour">
  <Swatch value={hue.name} background={hue.swatch} label={hue.name} />
</SwatchGroup>
```

- Built on `RadioGroup`.
- `background` is any CSS background: flat color, `gradientSwatch()`, `dotSwatch()`.
- One control for highlight colors, quote variants, and color presets.

### ColorField

```tsx
<ColorField
  label="Background"
  value={background}
  onChange={setBackground}
  presets={backgroundPresets}
  extra={variantIsGradient ? gradientOption : undefined}
/>
```

- Presets, optional extra swatch, hidden native color input, no popover.
- `allowCustom`, `valueLabel`.

### InlineEditField

```tsx
<InlineEditField
  label="Title"
  value={title}
  onChange={setTitle}
  visible={showTitle}
  onVisibleChange={setShowTitle}
/>
```

- Read row → textarea on click → blur/Enter closes.
- Optional visibility switch.

### MarkerRail

```tsx
<MarkerRail
  markers={marks.map((m) => ({ id: m.id, at: m.at, color: m.color, label: m.quote }))}
  onSelect={jump}
  ariaLabel="Highlights"
/>
```

- Data-in, no popover.
- Ticks at `0..1`, end caps, hover growth, tooltip.

### useTextSelection

```ts
const selection = useTextSelection(containerRef, {
  selector: "p",
  settle: 180,
  snapToWords: true,
  ignoreWordGesture: true,
});
// { range, rect, element, text, start, end, clear }
```

The reader's selection logic minus marks and UI.

## Highlight

```tsx
<Highlight
  containerRef={ref}
  marks={marks}
  onMarksChange={setMarks}
  onShareQuote={setQuote}
  onCopyLink={copyPassageLink}
  selector="p"
  colorScheme="auto"
/>
```

- Controlled marks: `{ id, quote, occurrence, hue }`. Offsets never leave the
  engine.
- No children: renders the default `HighlightToolbar`.
- With children: compose the toolbar.

```tsx
<Highlight ...>
  <HighlightToolbar>
    <HighlightList />
    <HighlightColors />
    <HighlightActions>
      <HighlightCopy />
      <HighlightShare onShare={setQuote} />
      <HighlightLink onCopy={copyPassageLink} />
      <HighlightRemove />
    </HighlightActions>
  </HighlightToolbar>
</Highlight>
```

`HighlightRail` is separate because the reader portals it outside the scroller:

```tsx
<HighlightRail ticks={ticks} onJump={jump} onOpenNotes={openNotes} />
```

## Quote

```tsx
<QuoteCard
  quote={quote}
  title={title}
  publication={publication}
  context={context}
  mode="post"
  theme={theme}
  variant={variant}
  options={overrides}
  className="w-[220px]"
/>
```

```tsx
<ShareQuoteDialog
  open={open}
  onOpenChange={setOpen}
  quote={quote}
  context={context}
  title={title}
  publication={publication}
  themes={THEMES}
  modes={MODES}
  fonts={FONT_STACKS}
/>
```

`QuoteCarousel`, `QuoteVariantPicker`, and `QuoteCustomizer` are installed
separately; `ShareQuoteDialog` composes them.

## Registry items

| Item | Type | Contains |
| :--- | :--- | :--- |
| `highlight` | ui | `highlight.tsx` + palette/anchor/wave libs; depends `anchored-panel`, `swatch` |
| `highlight-rail` | ui | `highlight-rail.tsx`; depends `marker-rail` |
| `article-highlights` | block | highlight + rail + app persistence example |
| `quote-card` | ui | `quote-card.tsx` + render/themes/paint libs; depends `canvas` |
| `quote-carousel` | ui | `quote-carousel.tsx`; depends `snap-carousel`, `quote-card` |
| `quote-variant-picker` | ui | `quote-variant-picker.tsx`; depends `swatch` |
| `quote-customizer` | ui | `quote-customizer.tsx`; depends `color-field`, `inline-edit-field` |
| `share-quote-dialog` | ui | `share-quote-dialog.tsx`; depends carousel, variant picker, customizer, `side-panel` |
| `quote-share` | block | dialog + example wiring |
| `snap-carousel` | ui | `snap-carousel.tsx` |
| `anchored-panel` | ui | `anchored-panel.tsx` + hook |
| `side-panel` | ui | `side-panel.tsx` |
| `canvas` | ui | `canvas.tsx` |
| `swatch` | ui | `swatch.tsx` |
| `color-field` | ui | `color-field.tsx` |
| `inline-edit-field` | ui | `inline-edit-field.tsx` |
| `marker-rail` | ui | `marker-rail.tsx` |
| `use-text-selection` | hook | `use-text-selection.ts` |

```bash
npx shadcn@latest add https://ui.souravinsights.com/r/highlight.json
npx shadcn@latest add https://ui.souravinsights.com/r/quote-share.json
```

## API conventions

- Controlled: `value` + `onValueChange`; `open` + `onOpenChange`.
- Events: `onMarksChange`, `onShareQuote`, `onSelect`.
- Positive booleans: `editable`, `visible`.
- `asChild` only where a primitive wraps a consumer element.
- `data-slot` on roots/parts, `data-state` for visual state, CSS vars for
  measurements.
- `lucide-react`, `motion/react`, shadcn CSS vars. No `next/*` in registry items.
- No barrel files.

## Phases

1. **Libs.** Split anchors, presets, paint, render. No UI change.
2. **Primitives.** `Swatch`, `AnchoredPanel`, `SnapCarousel`, `SidePanel`,
   `Canvas`, `MarkerRail`, `ColorField`, `InlineEditField`, `useTextSelection`.
   Replace current inline uses one at a time.
3. **Families.** `highlight.tsx`, `quote-*`, `share-quote-dialog.tsx`. Blog and
   insights consume the same code.
4. **Recipes, registry, docs.** Two blocks, registry build, four examples.
5. **Freeze v1.** No editor adapter, no generic studio, no extra themes until a
   real consumer asks.

## Not extracted

- `Row` and `Choice`: `Label` + `Select`.
- A DOM renderer for mesh backgrounds: canvas is the single renderer.
- The share dialog's stage/footer: only this dialog uses it.
- The wave: coupled to `data-hl`/`data-ch`; stays a lib for the engine.
- `useScrolled`: a sticky-header detail.

## Open decisions

1. **Own carousel vs shadcn `Carousel`.** Embla loses the spring glide and peek.
   Recommendation: own `SnapCarousel`.
2. **`AnchoredPanel` vs `Popover`.** Shadcn's `Popover` cannot anchor to a text
   range without a fake trigger element. Recommendation: `AnchoredPanel`, documented
   as the selection-range sibling of `Popover`.
3. **Publish generic primitives or keep them unlisted.** Recommendation: publish.
   They are the reusable half of the kit.
4. **Color scheme.** `colorScheme` prop (`auto|light|dark`) vs `next-themes`.
   Recommendation: prop.
5. **Mark IDs.** Default `crypto.randomUUID()` vs required. Recommendation: default.