import { JSDOM, VirtualConsole } from "jsdom";

// Modern CSS (color-mix, range syntax) makes jsdom's CSS parser noisy. The
// CSS is irrelevant to extraction — read in silence.
const silentConsole = new VirtualConsole();

/**
 * read — one page's HTML becomes clean markdown + metadata, via defuddle
 * (pinned exact in package.json). defuddle never executes JavaScript; the
 * caller decides when a rendered page is needed and passes that HTML in here.
 *
 * `useAsync: false` keeps reads deterministic and offline: no extractor may
 * fetch third-party APIs (youtube transcripts, x oembed) mid-parse. If a
 * Twitter/youtube link pulls back thin, that's a known trade — not a bug.
 */

export interface PageRead {
  markdown: string;
  title: string;
  description: string;
  author: string;
  published: string;
  site: string;
  wordCount: number;
  /** What extraction method the engine reports, for the log line. */
  extractorType?: string;
}

export const wordCount = (text: string) =>
  text ? text.split(/\s+/).filter(Boolean).length : 0;

/** The `Defuddle` function's own signature — types shipped by the package. */
type DefuddleFn = typeof import("defuddle/node").Defuddle;

/**
 * `defuddle/node` is a CommonJS file behind an `import`-only export map entry,
 * and its README requires `"type": "module"` in package.json to import cleanly.
 * This repo is CommonJS, so the bundler and Node's own loader disagree on the
 * shape (`{ Defuddle }` vs `{ default: { Defuddle } }`). Accept either.
 */
async function loadDefuddle(): Promise<DefuddleFn> {
  const mod = (await import("defuddle/node")) as {
    Defuddle?: DefuddleFn;
    default?: DefuddleFn | { Defuddle?: DefuddleFn };
  };
  const candidate =
    mod.Defuddle ??
    (typeof mod.default === "function" ? mod.default : mod.default?.Defuddle);
  if (typeof candidate !== "function") {
    throw new Error(
      `defuddle/node did not expose Defuddle (keys: ${Object.keys(mod).join(", ")})`
    );
  }
  return candidate;
}

export async function readPage(
  html: string,
  url: string
): Promise<PageRead | null> {
  try {
    // defuddle's ./node subpath is ESM-only in its exports map, and our scripts
    // transpile to CJS — a static import fails to resolve. Dynamic import works.
    const Defuddle = await loadDefuddle();
    const dom = new JSDOM(html, { url, virtualConsole: silentConsole });
    const result = await Defuddle(dom.window.document, url, {
      markdown: true,
      useAsync: false,
    });
    if (!result?.content?.trim()) {
      // Distinguish "the page was a challenge/stub" from "the parser broke":
      // a real page is tens to hundreds of KB.
      console.warn("readPage: defuddle returned no content", {
        url,
        htmlChars: html.length,
        title: result?.title ?? null,
      });
      return null;
    }

    return {
      markdown: result.content.trim(),
      title: result.title ?? "",
      description: result.description ?? "",
      author: result.author ?? "",
      published: result.published ?? "",
      site: result.site ?? "",
      wordCount: result.wordCount || wordCount(result.content),
      extractorType: result.extractorType,
    };
  } catch (error) {
    console.warn("readPage: threw", {
      url,
      htmlChars: html.length,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
