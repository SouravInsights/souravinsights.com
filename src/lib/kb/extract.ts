import { createHash } from "node:crypto";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { renderHtml } from "./render";

/**
 * Turn one link into clean text — the step that decides whether the knowledge
 * base is any good. It's a **fallback ladder**: try the cheapest path first,
 * escalate only when it fails, and never let one bad page stop the run.
 *
 *   1. plain fetch  → Readability over jsdom   (most articles)
 *   2. headless browser → Readability          (JS-only / bot-walled pages)
 *   3. give up → mark `failed`, keep the one-line description
 *
 * GitHub repos are special-cased to read the README (the repo page is chrome).
 * Portfolios / design / newsletters are skipped on purpose — their value is the
 * description, not the page.
 */

export type ExtractStatus = "ok" | "thin" | "failed" | "skipped";

export interface ExtractResult {
  status: ExtractStatus;
  /** The page's own <title>, for backfilling `Untitled` links. */
  title: string;
  text: string;
  /** sha256 of `text` — unchanged pages are skipped on re-runs. */
  contentHash: string | null;
  /** The URL we actually ended on, after redirects. */
  finalUrl: string;
  /** Which rung won: static | render | github | skipped | none. */
  via: "static" | "render" | "github" | "skipped" | "none";
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const MAX_BYTES = 5 * 1024 * 1024;
/** Below this many words, text is too thin to be worth embedding. */
const THIN_WORDS = 200;

/** Channels whose value is the description, not the page. Never fetched. */
const SKIP_CHANNELS = new Set(["newsletters", "fav-portfolios", "design-inspo"]);

interface Candidate {
  text: string;
  title: string;
  via: ExtractResult["via"];
  finalUrl: string;
}

export interface FetchedPage {
  finalUrl: string;
  contentType: string;
  html: string;
}

/**
 * The one network seam for static fetches: give it a URL, get HTML. A hosted
 * fetcher (e.g. Browserbase) could replace this body later without touching the
 * ladder around it.
 */
async function fetchPage(inputUrl: string): Promise<FetchedPage | null> {
  let url = inputUrl;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "user-agent": UA,
          accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
      });
    } catch {
      return null; // DNS failure, refused, timeout
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      try {
        url = new URL(location, url).toString();
      } catch {
        return null;
      }
      continue;
    }

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    const html = await readCapped(res, MAX_BYTES).catch(() => "");
    return { finalUrl: url, contentType, html };
  }

  return null; // redirect loop
}

/** Read a response body, stopping at `max` bytes so a huge page can't OOM us. */
async function readCapped(res: Response, max: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return await res.text();

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

const isHtml = (contentType: string) =>
  /text\/html|application\/xhtml/i.test(contentType);

const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("hex");

const wordCount = (text: string) =>
  text ? text.split(/\s+/).filter(Boolean).length : 0;

/** Collapse whitespace and blank-line noise into readable paragraphs. */
function clean(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Run Readability over HTML. Returns null when it can't find an article. */
function readabilityText(
  html: string,
  url: string
): { title: string; text: string } | null {
  try {
    // The url lets Readability resolve relative links; scripts stay off.
    const dom = new JSDOM(html, { url });
    const article = new Readability(dom.window.document).parse();
    if (!article) return null;
    return { title: article.title ?? "", text: article.textContent ?? "" };
  } catch {
    return null;
  }
}

const GITHUB_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/?#]+)/i;

/** For a GitHub repo, read the raw README — that's where the content is. */
async function githubReadme(url: string): Promise<string | null> {
  const match = GITHUB_RE.exec(url);
  if (!match) return null;
  const [, owner, repo] = match;

  for (const ref of ["HEAD", "main", "master"]) {
    for (const name of ["README.md", "readme.md", "README"]) {
      const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${name}`;
      try {
        const res = await fetch(raw, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (res.ok) {
          const text = await res.text();
          if (text.trim()) return text;
        }
      } catch {
        // try the next ref/name
      }
    }
  }
  return null;
}

/** Light Markdown strip — enough to get readable text out of a README. */
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // Strip HTML tags before the `[*_>]` pass below, or the `>` is gone first.
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_>]/g, "");
}

/**
 * Products read one extra page: a linked, same-domain `/pricing`. This is the
 * single "second hop" the spec allows — same origin, one link, no crawling.
 */
async function readPricing(html: string, baseUrl: string): Promise<string | null> {
  let pricingUrl: string | null = null;
  try {
    const dom = new JSDOM(html, { url: baseUrl });
    const base = new URL(baseUrl);
    for (const anchor of Array.from(
      dom.window.document.querySelectorAll("a[href]")
    )) {
      const href = anchor.getAttribute("href");
      if (!href) continue;
      try {
        const u = new URL(href, baseUrl);
        if (u.origin === base.origin && /^\/pricing\b/i.test(u.pathname)) {
          pricingUrl = u.toString();
          break;
        }
      } catch {
        // ignore malformed hrefs
      }
    }
  } catch {
    return null;
  }

  if (!pricingUrl) return null;
  const page = await fetchPage(pricingUrl).catch(() => null);
  if (!page || !isHtml(page.contentType)) return null;
  const article = readabilityText(page.html, page.finalUrl);
  return article && wordCount(article.text) >= 20 ? article.text : null;
}

/** Clean, classify and hash the winning candidate. */
function finalize(candidate: Candidate): ExtractResult {
  const text = clean(candidate.text);
  return {
    status: wordCount(text) < THIN_WORDS ? "thin" : "ok",
    title: candidate.title.trim(),
    text,
    contentHash: text ? sha256(text) : null,
    finalUrl: candidate.finalUrl,
    via: candidate.via,
  };
}

/** Read one link. Never throws — a bad page comes back as `failed`. */
export async function extract(
  url: string,
  channel: string
): Promise<ExtractResult> {
  if (SKIP_CHANNELS.has(channel)) {
    return {
      status: "skipped",
      title: "",
      text: "",
      contentHash: null,
      finalUrl: url,
      via: "skipped",
    };
  }

  // GitHub: the README is the content. Fall through to the ladder if missing.
  if (GITHUB_RE.test(url)) {
    const md = await githubReadme(url).catch(() => null);
    if (md) {
      const text = stripMarkdown(md);
      if (wordCount(text) >= 20) {
        return finalize({ text, title: "", via: "github", finalUrl: url });
      }
    }
  }

  let best: Candidate | null = null;

  // Rung 1: plain fetch + Readability.
  const page = await fetchPage(url).catch(() => null);
  if (page && isHtml(page.contentType)) {
    const article = readabilityText(page.html, page.finalUrl);
    if (article) {
      let text = article.text;
      if (channel === "product-hunt") {
        const pricing = await readPricing(page.html, page.finalUrl).catch(
          () => null
        );
        if (pricing) text += `\n\n${pricing}`;
      }
      best = {
        text,
        title: article.title,
        via: "static",
        finalUrl: page.finalUrl,
      };
    }
  }

  // Rung 1 produced a solid result — stop here, no browser needed.
  if (best && wordCount(best.text) >= THIN_WORDS) return finalize(best);

  // Rung 2: render with a real browser, then Readability again. Readability
  // discards a lot of text on app-style pages, so if it finds almost nothing we
  // fall back to the page's visible body text rather than record `failed`.
  const rendered = await renderHtml(url).catch(() => null);
  if (rendered) {
    const article = readabilityText(rendered.html, url);
    const readable = article?.text ?? "";
    const useBody =
      wordCount(readable) < 50 && wordCount(rendered.text) > wordCount(readable);
    const text = useBody ? rendered.text : readable;
    if (wordCount(text) > wordCount(best?.text ?? "")) {
      best = {
        text,
        title: article?.title ?? "",
        via: "render",
        finalUrl: url,
      };
    }
  }

  // Keep whatever text we have (even a little) so `thin` still helps search.
  if (best && wordCount(best.text) > 0) return finalize(best);

  return {
    status: "failed",
    title: "",
    text: "",
    contentHash: null,
    finalUrl: page?.finalUrl ?? url,
    via: "none",
  };
}

