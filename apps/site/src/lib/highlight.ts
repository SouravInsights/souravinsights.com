import { createHighlighter, type Highlighter } from "shiki";

/**
 * Syntax highlighting for code that lives in a component rather than in
 * markdown, where rehype-pretty-code cannot reach it.
 *
 * The blog renders code with shiki's `github-dark`, so this uses the same
 * grammar and the same dark palette. It adds `github-light` on top, because
 * the docs page is a normal page that can be read in light mode, and
 * `github-dark` on a pale panel is close to unreadable: its plain text is
 * nearly white.
 */
const THEMES = { light: "github-light", dark: "github-dark" } as const;

// Loading grammars and their WASM is expensive, so the highlighter is built
// once per process and reused. Shiki caches it internally too.
let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: Object.values(THEMES),
    langs: ["bash", "json"],
  });

  return highlighterPromise;
}

/**
 * Highlight `code` to HTML.
 *
 * `defaultColor: false` makes shiki emit both palettes as CSS variables instead
 * of picking one, so `globals.css` can switch them on the `.dark` class. That
 * keeps this function independent of the current theme and lets one render
 * serve both.
 *
 * `structure: "inline"` returns the tokens alone, without a `<pre>` wrapper.
 * Shiki's own wrapper carries `tabindex="0"`, which would add a second tab stop
 * to every block, and the page's own `<pre>` already provides the scroll region
 * and its label.
 */
export async function highlight(code: string, lang: string): Promise<string> {
  const highlighter = await getHighlighter();

  return highlighter.codeToHtml(code, {
    lang,
    themes: THEMES,
    defaultColor: false,
    structure: "inline",
  });
}
