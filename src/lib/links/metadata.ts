/**
 * A cheap page title + description, read from the raw HTML with no DOM.
 *
 * The card on /insights shows a link's title, and a link added on the site has
 * no Discord embed to borrow one from. Fetching it here means the card is
 * correct the moment the row exists, instead of waiting for the full read
 * (defuddle + markdown), which still runs later and owns the stored content.
 *
 * One GET, capped, never throws — a page with no tags just yields empty strings
 * and the card falls back to the hostname.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const TIMEOUT_MS = 8_000;
/** Enough to reach the <head> on almost every page. */
const MAX_BYTES = 256 * 1024;

export interface PageMetadata {
  title: string;
  description: string;
}

/** A code point only if it is valid; a malformed entity must not throw. */
const codePoint = (value: number) =>
  Number.isFinite(value) && value >= 0 && value <= 0x10ffff
    ? String.fromCodePoint(value)
    : "";

const decodeEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => codePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => codePoint(parseInt(h, 16)));

const clean = (value: string) =>
  decodeEntities(value).replace(/\s+/g, " ").trim();

/** First regex whose capture group is non-empty. */
function firstMatch(html: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return clean(match[1]);
  }
  return "";
}

/** Read a response body, stopping at `max` bytes. */
async function readCapped(res: Response, max: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return (await res.text()).slice(0, max);

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      chunks.push(value);
      if (total >= max) {
        await reader.cancel().catch(() => undefined);
        break;
      }
    }
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function fetchPageMetadata(url: string): Promise<PageMetadata> {
  let html = "";
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) return { title: "", description: "" };
    html = await readCapped(res, MAX_BYTES);
  } catch {
    return { title: "", description: "" };
  }

  const title = firstMatch(html, [
    /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]*property=["']og:title["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ]);

  const description = firstMatch(html, [
    /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]*property=["']og:description["']/i,
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i,
  ]);

  return { title, description };
}
