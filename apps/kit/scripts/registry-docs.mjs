/**
 * Authored docs content per registry item.
 *
 * The generator writes the mechanical parts (preview, installation, source).
 * This file holds the parts a human has to write: the usage snippet and any
 * named examples. `usage` is raw MDX. `examples` render a demo under a heading.
 */
export const registryDocs = {
  highlight: {
    usage: `\`\`\`tsx
import { Highlight } from "@/components/highlight/highlight"
\`\`\`

\`\`\`tsx
const containerRef = useRef<HTMLElement>(null)

<article ref={containerRef}>
  <p>The best interfaces disappear.</p>
</article>

<Highlight
  containerRef={containerRef}
  editable
  onShareQuote={(quote) => openStudio(quote)}
/>
\`\`\``,
    examples: [
      {
        title: "Article, rail and studio",
        name: "article-highlights-demo",
        description: "The palette, the highlight rail and the quote dialog wired to local marks.",
      },
    ],
  },

  "highlight-anchor": {
    usage: `\`\`\`tsx
import { cut, snap } from "@/lib/highlight-anchor"
\`\`\`

\`\`\`tsx
const [start, end] = snap(text, roughStart, roughEnd)

const next = cut(marks, para, text, start, end, () => nextId++)
\`\`\``,
  },

  "highlight-palette": {
    usage: `\`\`\`tsx
import { HUES, paint } from "@/lib/highlight-palette"
\`\`\`

\`\`\`tsx
const { ink, wash } = paint(2, false) // amber, light theme
\`\`\``,
  },

  "highlight-wave": {
    usage: `\`\`\`tsx
import { playWave } from "@/components/highlight/wave"
\`\`\`

\`\`\`tsx
playWave(paragraph, layer, markId, from, to, swatch, removing, under)
\`\`\``,
  },

  "use-text-selection": {
    usage: `\`\`\`tsx
import { useTextSelection } from "@/hooks/use-text-selection"
\`\`\`

\`\`\`tsx
const read = useTextSelection({ containerRef, paragraphs, wordSelect })
const selection = read()

if (selection) {
  const { para, start, end } = selection
}
\`\`\``,
  },

  "use-reduced-motion": {
    usage: `\`\`\`tsx
import { useReducedMotion } from "@/hooks/use-reduced-motion"
\`\`\`

\`\`\`tsx
const reduce = useReducedMotion()
\`\`\``,
  },

  "quote-share-dialog": {
    usage: `\`\`\`tsx
import { ShareQuoteDialog } from "@/components/quote/dialog"
\`\`\`

\`\`\`tsx
const [open, setOpen] = useState(false)

<button onClick={() => setOpen(true)}>Share quote</button>

<ShareQuoteDialog
  open={open}
  onOpenChange={setOpen}
  quote="The best interfaces disappear."
  context=""
  title="Disappearing interfaces"
  publication="souravinsights.com"
/>
\`\`\``,
    examples: [
      {
        title: "Share button",
        name: "quote-share-demo",
        description: "A button that opens the studio on a fixed quote.",
      },
    ],
  },

  "quote-actions": {
    usage: `\`\`\`tsx
import { QuoteActions } from "@/components/quote/actions"
\`\`\`

\`\`\`tsx
<QuoteActions
  customize={customize}
  onCustomizeChange={setCustomize}
  status={status}
  statusText={statusText}
  onSave={save}
  onCopy={copy}
/>
\`\`\``,
  },

  "quote-carousel": {
    usage: `\`\`\`tsx
import { QuoteCarousel } from "@/components/quote/carousel"
\`\`\`

\`\`\`tsx
<QuoteCarousel
  themes={THEMES}
  themeId={themeId}
  onThemeChange={setThemeId}
  mode="story"
  band={band}
  frameWidth={frameWidth}
  frameHeight={band}
  content={content}
  variantByTheme={variantByTheme}
  overridesByTheme={overridesByTheme}
/>
\`\`\``,
  },

  "quote-card": {
    usage: `\`\`\`tsx
import { QuoteCard } from "@/components/quote/quote-card"
\`\`\`

\`\`\`tsx
<QuoteCard
  mode="story"
  theme={THEMES[0]}
  variant={THEMES[0].variants[0]}
  content={content}
/>
\`\`\``,
  },

  "quote-options": {
    usage: `\`\`\`tsx
import { QuoteOptions } from "@/components/quote/options"
\`\`\`

\`\`\`tsx
<QuoteOptions
  theme={theme}
  variant={variant}
  options={options}
  overrides={overrides}
  set={set}
  clear={clear}
  reset={reset}
  quote={quote}
  setQuote={setQuote}
  title={title}
  setTitle={setTitle}
  publication={publication}
  setPublication={setPublication}
  onDone={() => setCustomize(false)}
  scrolled={scrolled}
/>
\`\`\``,
  },

  "quote-variant-picker": {
    usage: `\`\`\`tsx
import { QuoteVariantPicker } from "@/components/quote/variant-picker"
\`\`\`

\`\`\`tsx
<QuoteVariantPicker
  variants={theme.variants}
  value={index}
  onValueChange={setIndex}
  label={\`\${theme.name} colours\`}
/>
\`\`\``,
  },

  "quote-presets": {
    usage: `\`\`\`tsx
import { MODES, fontStack } from "@/components/quote/presets"
\`\`\`

\`\`\`tsx
const story = MODES.find((mode) => mode.id === "story")
const font = fontStack("serif")
\`\`\``,
  },

  "quote-themes": {
    usage: `\`\`\`tsx
import { THEMES, themeById, mesh } from "@/components/quote/themes"
\`\`\`

\`\`\`tsx
const theme = themeById("marker")
\`\`\``,
  },

  "quote-render": {
    usage: `\`\`\`tsx
import { cardToBlob, resolveOptions } from "@/components/quote/render"
\`\`\`

\`\`\`tsx
const options = resolveOptions(theme, variant, overrides, content)
const blob = await cardToBlob("story", theme, options)
\`\`\``,
  },

  "article-highlights": {
    usage: `\`\`\`tsx
import { ArticleHighlights } from "@/components/blocks/article-highlights"
\`\`\`

\`\`\`tsx
<ArticleHighlights title="Disappearing interfaces">
  <p>The best interfaces disappear.</p>
</ArticleHighlights>
\`\`\``,
  },

  "quote-share": {
    usage: `\`\`\`tsx
import { QuoteShare } from "@/components/blocks/quote-share"
\`\`\`

\`\`\`tsx
<QuoteShare
  quote="The best interfaces disappear."
  title="Disappearing interfaces"
  publication="souravinsights.com"
/>
\`\`\``,
  },

  "anchored-panel": {
    usage: `\`\`\`tsx
import { AnchoredPanel } from "@/components/ui/anchored-panel"
\`\`\`

\`\`\`tsx
<AnchoredPanel open={open} onOpenChange={setOpen} anchor={anchor}>
  Panel body
</AnchoredPanel>
\`\`\``,
  },

  canvas: {
    usage: `\`\`\`tsx
import { Canvas } from "@/components/ui/canvas"
\`\`\`

\`\`\`tsx
<Canvas
  width={1080}
  height={1920}
  draw={(ctx, { width, height }) => drawCard(ctx, width, height)}
/>
\`\`\``,
  },

  "color-field": {
    usage: `\`\`\`tsx
import { ColorField } from "@/components/ui/color-field"
\`\`\`

\`\`\`tsx
<ColorField label="Highlight" value={value} onChange={setValue} />
\`\`\``,
  },

  "color-picker": {
    usage: `\`\`\`tsx
import {
  ColorPicker,
  ColorPickerBrightness,
  ColorPickerHex,
  ColorPickerSide,
  ColorPickerWheel,
} from "@/components/ui/color-picker"
\`\`\`

\`\`\`tsx
<ColorPicker value={value} onChange={setValue}>
  <ColorPickerWheel />
  <ColorPickerSide>
    <ColorPickerBrightness />
    <ColorPickerHex />
  </ColorPickerSide>
</ColorPicker>
\`\`\``,
  },

  "inline-edit-field": {
    usage: `\`\`\`tsx
import { InlineEditField } from "@/components/ui/inline-edit-field"
\`\`\`

\`\`\`tsx
<InlineEditField label="Title" value={value} onChange={setValue} />
\`\`\``,
  },

  "marker-rail": {
    usage: `\`\`\`tsx
import { MarkerRail } from "@/components/ui/marker-rail"
\`\`\`

\`\`\`tsx
<MarkerRail
  markers={[{ id: 1, at: 0.35, color: "#f4e58a", label: "The best interfaces disappear." }]}
  onSelect={(id) => jumpTo(id)}
  ariaLabel="Highlights"
/>
\`\`\``,
  },

  "side-panel": {
    usage: `\`\`\`tsx
import { SidePanel } from "@/components/ui/side-panel"
\`\`\`

\`\`\`tsx
<SidePanel open={open} side="left" width={288}>
  Panel body
</SidePanel>
\`\`\``,
  },

  "snap-carousel": {
    usage: `\`\`\`tsx
import {
  SnapCarousel,
  SnapCarouselContent,
  SnapCarouselItem,
} from "@/components/ui/snap-carousel"
\`\`\`

\`\`\`tsx
<SnapCarousel items={items} value={value} onValueChange={setValue}>
  <SnapCarouselContent>
    {items.map((id) => (
      <SnapCarouselItem key={id} value={id}>
        {id}
      </SnapCarouselItem>
    ))}
  </SnapCarouselContent>
</SnapCarousel>
\`\`\``,
  },

  swatch: {
    usage: `\`\`\`tsx
import { Swatch, SwatchGroup } from "@/components/ui/swatch"
\`\`\`

\`\`\`tsx
<SwatchGroup value={hue} onValueChange={setHue}>
  <Swatch value="2" background="#f4e58a" label="Amber" />
</SwatchGroup>
\`\`\``,
  },
};
