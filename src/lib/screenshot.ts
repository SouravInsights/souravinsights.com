import { launchBrowser } from "./browser";

// Retina viewport so previews stay crisp when shown at 2x.
const VIEWPORT = { width: 1280, height: 800, deviceScaleFactor: 2 };
// Keep the whole capture comfortably under the route's 60s ceiling.
const NAV_TIMEOUT = 30_000;
const ASSET_WAIT = 5_000;
const SETTLE_DELAY = 1_000;

/**
 * Capture a viewport screenshot of a URL with a real headless browser. Mirrors
 * briOS: works locally (system Chrome) and on Vercel (@sparticuz/chromium).
 */
export async function captureScreenshot(url: string): Promise<Buffer> {
  const browser = await launchBrowser(VIEWPORT);

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Wait for the page to be *visually ready*, not for its `load` event —
    // that can hang on a third-party script (analytics, ads) while the page
    // itself is fully rendered. Document + fonts + images is the real signal.
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });

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

    await new Promise((resolve) => setTimeout(resolve, SETTLE_DELAY));

    const screenshot = await page.screenshot({ type: "png", fullPage: false });
    return Buffer.from(screenshot);
  } finally {
    // Never let a stuck browser block the response.
    await browser.close().catch(() => undefined);
  }
}