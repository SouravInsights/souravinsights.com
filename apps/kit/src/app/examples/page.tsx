import Link from "next/link";
import styles from "../page.module.css";

const examples = [
  {
    title: "Minimal article",
    body: "Controlled marks, the default palette and its share dialog.",
    code: `"use client";

import { useRef, useState } from "react";
import {
  Highlight,
  type HighlightMark,
} from "@/components/highlight/highlight";
import { ShareQuoteDialog } from "@/components/quote/dialog";

const [marks, setMarks] = useState<HighlightMark[]>([]);
const [quote, setQuote] = useState(null);
const ref = useRef<HTMLDivElement>(null);

<div ref={ref}>{content}</div>

<Highlight
  containerRef={ref}
  marks={marks}
  onMarksChange={setMarks}
  onShareQuote={setQuote}
/>

<ShareQuoteDialog
  open={!!quote}
  onOpenChange={(open) => !open && setQuote(null)}
  quote={quote?.quote ?? ""}
  context={quote?.context ?? ""}
  title={title}
  publication={publication}
/>`,
  },
  {
    title: "Custom toolbar",
    body: "Keep the engine, drop the actions you do not want.",
    code: `<Highlight containerRef={ref} marks={marks} onMarksChange={setMarks}>
  <HighlightToolbar>
    <HighlightColors />
    <HighlightActions>
      <HighlightShare onShare={setQuote} />
      <HighlightRemove />
    </HighlightActions>
    <HighlightList />
  </HighlightToolbar>
</Highlight>`,
  },
  {
    title: "Persisted marks",
    body: "Use the callbacks when the marks live in your own database.",
    code: `<Highlight
  containerRef={ref}
  initialMarks={saved}
  onCreate={async (anchor) => api.create(anchor)}
  onRecolor={(id, hue) => api.recolor(id, hue)}
  onDelete={(id) => api.remove(id)}
  onShareQuote={setQuote}
/>`,
  },
  {
    title: "Quote card only",
    body: "Skip the studio and draw one card.",
    code: `import { QuoteCard } from "@/components/quote/quote-card";
import { THEMES } from "@/components/quote/themes";

<QuoteCard
  theme={THEMES[0]}
  variant={THEMES[0].variants[0]}
  mode="post"
  content={{ quote, title, publication, context }}
/>`,
  },
];

export default function Page() {
  return (
    <main className={styles.doc}>
      <Link href="/" className={styles.back}>
        ← UI Kit
      </Link>
      <header className={styles.docHead}>
        <p className={styles.eyebrow}>Examples</p>
        <h1>Use it</h1>
        <p className={styles.docDesc}>
          Four starting points. Install the matching item, then edit the source.
        </p>
      </header>

      {examples.map((example) => (
        <section key={example.title} className={styles.example}>
          <h2>{example.title}</h2>
          <p>{example.body}</p>
          <pre className={styles.docCode}>
            <code>{example.code}</code>
          </pre>
        </section>
      ))}
    </main>
  );
}
