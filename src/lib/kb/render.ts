import { launchBrowser } from "@/lib/browser";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const NAV_TIMEOUT = 30_000;
const SETTLE_MS = 1_000;

/**
 * Render a page in a real browser and return its HTML *after* scripts have run.
 *
 * This is extraction's last rung: some pages return 200 with an empty body from
 * a plain fetch because their content is built by JavaScript. Only those pages
 * should pay for this; it's the slowest, heaviest path. The browser is always
 * closed, even on failure — a stuck render must not hang the run.
 */
export async function renderHtml(url: string): Promise<string> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
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
    return await page.content();
  } finally {
    await browser.close().catch(() => undefined);
  }
}
