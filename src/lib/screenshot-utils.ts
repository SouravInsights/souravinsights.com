import type { Page } from "puppeteer-core";
import sharp from "sharp";

/**
 * Internals for `screenshot.ts`: everything that touches the browser's DOM or
 * the stitched image. The capture entry points stay thin and only orchestrate.
 */

// Retina viewport so `viewport` previews stay crisp when shown at 2x.
export const VIEWPORT = { width: 1280, height: 800, deviceScaleFactor: 2 };
// Scroll-through captures are shown small, so 1x keeps the file sane.
export const SCROLL_VIEWPORT = {
  width: 1280,
  height: 800,
  deviceScaleFactor: 1,
};
// Generous, so the pan reaches the real bottom of almost any page. The stored
// WebP is wide-scaled and only ever fetched on hover.
export const SCROLL_MAX_HEIGHT = 14400;
// SPAs render their real layout after hydration; measure only once they have.
export const HYDRATE_WAIT = 1_500;
// Keep the whole capture comfortably under the route's 60s ceiling.
export const NAV_TIMEOUT = 30_000;
export const ASSET_WAIT = 5_000;
export const SETTLE_DELAY = 1_000;
// Each tile is grabbed while its section is in view; give the reveal animation
// time to finish before the shutter.
export const TILE_SETTLE = 500;

// One near-viewport step, pausing long enough for lazy content and scroll
// reveals to land before the next step.
const SCROLL_STEP = Math.round(SCROLL_VIEWPORT.height * 0.9);
const SCROLL_PAUSE = 250;

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** A scroll-jacked section: a sticky host much taller than the viewport. */
export interface ScrollJack {
  start: number;
  end: number;
}

/**
 * Wait for the page to be *visually ready*, not for its `load` event — that can
 * hang on a third-party script (analytics, ads) while the page itself is fully
 * rendered. Document + fonts + images is the real signal.
 */
export async function waitForAssets(page: Page): Promise<void> {
  await page.evaluate(async (assetWait: number) => {
    await document.fonts.ready;

    const pendingImages = Array.from(document.images)
      .filter((image) => !image.complete)
      .map(
        (image) =>
          new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          })
      );

    await Promise.race([
      Promise.all(pendingImages),
      new Promise<void>((resolve) => setTimeout(resolve, assetWait)),
    ]);
  }, ASSET_WAIT);
}

/**
 * Walk the page top to bottom so JS-heavy sites fetch what a cold screenshot
 * would leave as gaps: lazy `<img>`s, IntersectionObserver reveals, streaming
 * sections. Then return to the top and let the requests finish.
 */
export async function primeForScroll(page: Page): Promise<void> {
  // Capture-only preferences. Reduced motion makes reveal-on-scroll sections
  // render immediately instead of as empty space; no scrollbar keeps the image
  // clean; `scroll-behavior: auto` makes `scrollTo` instant, so each step
  // settles.
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await page.addStyleTag({
    content:
      "html{scroll-behavior:auto !important}" +
      "*{scrollbar-width:none !important}" +
      "*::-webkit-scrollbar{display:none !important}",
  });

  // Lazy images below the fold never load on their own; promote them first.
  await page.evaluate(() => {
    document
      .querySelectorAll<HTMLImageElement>('img[loading="lazy"]')
      .forEach((image) => {
        image.loading = "eager";
      });
  });

  // Kept free of named inner functions: some bundlers inject a name helper into
  // the serialized `evaluate` body that does not exist in the browser.
  await page.evaluate(
    async (config: { max: number; step: number; pause: number }) => {
      let end = Math.min(
        config.max,
        Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        )
      );
      let guard = 0;
      // The page can grow as sections stream in, so recompute the end each step.
      for (let y = 0; y <= end && guard < 80; y += config.step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, config.pause));
        end = Math.min(
          config.max,
          Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          )
        );
        guard += 1;
      }

      window.scrollTo(0, end);
      await new Promise((resolve) => setTimeout(resolve, config.pause * 2));
      window.scrollTo(0, 0);
      await new Promise((resolve) => setTimeout(resolve, 300));
    },
    { max: SCROLL_MAX_HEIGHT, step: SCROLL_STEP, pause: SCROLL_PAUSE }
  );

  // Everything is eager now, so settle the requests the walk kicked off.
  await waitForAssets(page);
  await sleep(SETTLE_DELAY);
}

/**
 * Hide viewport-anchored bars so they are not repeated down the stitched image.
 * Fixed bars always; sticky ones only when they are a thin bar pinned to the
 * top. A tall sticky element is usually a scroll-jacked visual — content, not
 * chrome — and hiding it would blank the section it belongs to.
 */
export async function hideViewportBars(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (document.documentElement.dataset.previewBarsHidden) return;
    document.documentElement.dataset.previewBarsHidden = "1";
    for (const element of Array.from(
      document.querySelectorAll<HTMLElement>("*")
    )) {
      const position = getComputedStyle(element).position;
      if (position === "fixed") {
        element.style.visibility = "hidden";
        continue;
      }
      if (position === "sticky") {
        const rect = element.getBoundingClientRect();
        if (rect.top <= 8 && rect.height <= 160) {
          element.style.visibility = "hidden";
        }
      }
    }
  });
}

/**
 * Find scroll-jacked sections: a sticky element whose host is much taller than
 * the viewport. Tiling through one produces the same frame with different text
 * over and over, so the tiler captures one frame and skips to the host's end.
 */
export async function findScrollJacks(page: Page): Promise<ScrollJack[]> {
  return page.evaluate(() => {
    const ranges: { start: number; end: number }[] = [];
    const viewport = window.innerHeight;

    for (const element of Array.from(
      document.querySelectorAll<HTMLElement>("*")
    )) {
      if (getComputedStyle(element).position !== "sticky") continue;
      const host = element.parentElement;
      if (!host) continue;
      const rect = host.getBoundingClientRect();
      if (rect.height <= viewport * 1.5) continue;
      // Rounded: sharp rejects a fractional canvas height, and these come from
      // `getBoundingClientRect` as floats.
      const start = Math.round(rect.top + window.scrollY);
      ranges.push({ start, end: start + Math.round(rect.height) });
    }

    ranges.sort((a, b) => a.start - b.start);
    const merged: { start: number; end: number }[] = [];
    for (const range of ranges) {
      const last = merged[merged.length - 1];
      if (last && range.start <= last.end) {
        last.end = Math.max(last.end, range.end);
      } else {
        merged.push({ start: range.start, end: range.end });
      }
    }
    return merged;
  });
}

/** Full document height, clamped to the capture ceiling and rounded for sharp. */
export async function measurePageHeight(
  page: Page,
  max: number
): Promise<number> {
  return page.evaluate((limit) => {
    const full = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    return Math.round(Math.max(1, Math.min(limit, full)));
  }, max);
}

/**
 * Stack viewport tiles into one image. Tiles carry their own row so a collapsed
 * scroll-jack (an offset jump) still lands correctly.
 */
export async function stitchTiles(
  tiles: { top: number; buffer: Buffer }[],
  width: number,
  height: number
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .composite(
      tiles.map((tile) => ({
        input: tile.buffer,
        top: tile.top,
        left: 0,
      }))
    )
    .png()
    .toBuffer();
}
