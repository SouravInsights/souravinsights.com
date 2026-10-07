import { launchBrowser } from "@/lib/browser";
import type { Browser, Page } from "puppeteer-core";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const NAV_TIMEOUT = 30_000;
const SETTLE_MS = 1_000;
// Hard ceiling on one render. `goto` has its own timeout, but `document.fonts.ready`
// and `page.content()` can hang forever on a broken page — which stalled a whole
// run on a single URL. This bounds the damage to one link.
const RENDER_TIMEOUT_MS = 25_000;

/**
 * Render a page in a real browser and return its HTML *after* scripts have run,
 * plus the visible body text.
 *
 * Extraction's last rung: some pages return 200 with an empty body from a plain
 * fetch because their content is built by JavaScript.
 *
 * The browser is launched ONCE and reused for the whole batch. Launching a fresh
 * Chromium per page is what failed during the bulk build: under concurrency most
 * JS pages came back empty and were recorded as `failed`, even though they render
 * fine one at a time. The caller closes it with `closeRenderer()` when the run ends.
 */

export interface Rendered {
  /** Rendered HTML — fed to Readability. */
  html: string;
  /** `document.body.innerText` — visible text, used when Readability finds little. */
  text: string;
}

let shared: Promise<Browser> | null = null;

/** One browser for the process. A failed launch isn't cached, so it can retry. */
function browser(): Promise<Browser> {
  if (!shared) {
    shared = launchBrowser().catch((error) => {
      shared = null;
      throw error;
    });
  }
  return shared;
}

async function loadPage(page: Page, url: string): Promise<Rendered> {
  await page.setUserAgent(UA);
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT,
  });
  // Let fonts and late scripts settle before we grab the DOM.
  await page.evaluate(async (ms: number) => {
    await document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }, SETTLE_MS);
  const html = await page.content();
  const text = await page.evaluate(() => document.body?.innerText ?? "");
  return { html, text };
}

export async function renderHtml(url: string): Promise<Rendered> {
  const page = await (await browser()).newPage();
  try {
    return await withTimeout(
      loadPage(page, url),
      RENDER_TIMEOUT_MS,
      "render timed out"
    );
  } finally {
    // Close the page, not the browser — the browser is reused. Closing also
    // aborts any work still running after a timeout.
    await page.close().catch(() => undefined);
  }
}

/** Reject if `promise` hasn't settled within `ms`, so one page can't hang a run. */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/** Close the shared browser. Call once when a batch run finishes. */
export async function closeRenderer(): Promise<void> {
  if (!shared) return;
  const instance = await shared.catch(() => null);
  shared = null;
  await instance?.close().catch(() => undefined);
}
