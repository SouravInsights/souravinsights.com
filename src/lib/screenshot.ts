import { launchBrowser } from "./browser";
import {
  HYDRATE_WAIT,
  NAV_TIMEOUT,
  SCROLL_MAX_HEIGHT,
  SCROLL_VIEWPORT,
  SETTLE_DELAY,
  TILE_SETTLE,
  USER_AGENT,
  VIEWPORT,
  findScrollJacks,
  hideViewportBars,
  measurePageHeight,
  primeForScroll,
  sleep,
  stitchTiles,
  waitForAssets,
} from "./screenshot-utils";

/**
 * Capture a viewport screenshot of a URL with a real headless browser. Mirrors
 * briOS: works locally (system Chrome) and on Vercel (@sparticuz/chromium).
 */
export async function captureScreenshot(url: string): Promise<Buffer> {
  const browser = await launchBrowser(VIEWPORT);

  try {
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    await waitForAssets(page);
    await sleep(SETTLE_DELAY);

    const screenshot = await page.screenshot({ type: "png", fullPage: false });
    return Buffer.from(screenshot);
  } finally {
    // Never let a stuck browser block the response.
    await browser.close().catch(() => undefined);
  }
}

/**
 * Capture the whole page for the hover scroll-through.
 *
 * The page is assembled from viewport-sized tiles rather than one `fullPage`
 * shot. That is the whole point: sites that reveal sections on scroll keep
 * below-the-fold content at `opacity: 0`, so a single tall screenshot is full of
 * holes. A tile is only taken once its section has actually scrolled into view
 * and its reveal has played. Fixed and sticky bars are dropped after the first
 * tile so they do not repeat, and a scroll-jacked section contributes one frame
 * instead of dozens of near-identical ones.
 */
export async function captureScrollScreenshot(url: string): Promise<Buffer> {
  const browser = await launchBrowser(SCROLL_VIEWPORT);

  try {
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    await sleep(HYDRATE_WAIT);
    // Lazy sections (and the scroll-jacked kind especially) mount only after the
    // network goes quiet; measuring without this catches the shell, not the page.
    await page
      .waitForNetworkIdle({ idleTime: 750, timeout: 8_000 })
      .catch(() => undefined);
    await waitForAssets(page);
    await primeForScroll(page);

    const totalHeight = await measurePageHeight(page, SCROLL_MAX_HEIGHT);
    const scrollJacks = await findScrollJacks(page);
    const step = SCROLL_VIEWPORT.height;
    // The last tile cannot scroll past here; clamping it keeps the page bottom
    // in frame instead of a duplicate of the screen above it.
    const maxScroll = Math.max(0, totalHeight - step);
    const tiles: { top: number; buffer: Buffer }[] = [];

    let top = 0;
    let collapse = 0;
    let lastScroll = -1;

    while (top < totalHeight) {
      const scrollTop = Math.min(top, maxScroll);

      if (scrollTop !== lastScroll) {
        await page.evaluate((y) => window.scrollTo(0, y), scrollTop);
        if (scrollTop > 0) await hideViewportBars(page);

        // Let viewport-triggered reveals play before this tile is captured.
        await sleep(TILE_SETTLE);
        const tile = await page.screenshot({ type: "png", fullPage: false });
        // `collapse` folds skipped scroll-jack frames out of the image, so a
        // tile's row is its scroll offset minus everything skipped before it.
        tiles.push({ top: scrollTop - collapse, buffer: Buffer.from(tile) });
        lastScroll = scrollTop;
      }

      if (scrollTop >= maxScroll) break;

      // One frame is enough for a scroll-jacked section; skip its long tail.
      const jack = scrollJacks.find(
        (range) => top >= range.start && top < range.end
      );
      if (jack) {
        collapse += Math.max(0, jack.end - (top + step));
        top = Math.min(jack.end, totalHeight);
      } else {
        top += step;
      }
    }

    if (tiles.length === 1) return tiles[0].buffer;

    return stitchTiles(
      tiles,
      SCROLL_VIEWPORT.width,
      Math.max(1, totalHeight - collapse)
    );
  } finally {
    await browser.close().catch(() => undefined);
  }
}
