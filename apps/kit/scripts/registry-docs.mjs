/**
 * Authored docs content per registry item.
 *
 * The generator writes the mechanical parts (preview, installation, source).
 * This file holds the parts a human has to write: the usage snippet and any
 * named examples. `usage` is raw MDX. `examples` are demo names from
 * `src/lib/demos.ts`, each rendered as its own `<ComponentPreview>`.
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

  canvas: {
    usage: `\`\`\`tsx
import { Canvas } from "@/components/ui/canvas"
\`\`\`

\`\`\`tsx
<Canvas width={1080} height={1920} draw={(ctx, size) => drawCard(ctx, size)} />
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
