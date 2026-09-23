import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

// Retina viewport so previews stay crisp when shown at 2x.
const VIEWPORT = { width: 1280, height: 800, deviceScaleFactor: 2 };
const TIMEOUT = 20_000;
// Wait for images/styles (`load`) rather than full network idle, then let late
// paint settle. networkidle2 is what made captures take 30s+ on busy sites.
const SETTLE_DELAY = 1_500;

const IS_SERVERLESS =
  !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

async function getExecutablePath(): Promise<string> {
  if (IS_SERVERLESS) return chromium.executablePath();

  // Local development: fall back to a system Chrome.
  const { execSync } = await import("node:child_process");
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  ];

  for (const candidate of candidates) {
    try {
      execSync(`test -f "${candidate}"`);
      return candidate;
    } catch {
      // try the next candidate
    }
  }

  throw new Error(
    "Chrome not found. Install Google Chrome or set CHROME_PATH."
  );
}

/**
 * Capture a viewport screenshot of a URL with a real headless browser. Mirrors
 * briOS: works locally (system Chrome) and on Vercel (@sparticuz/chromium).
 */
export async function captureScreenshot(url: string): Promise<Buffer> {
  const executablePath = process.env.CHROME_PATH || (await getExecutablePath());

  const browser = await puppeteer.launch({
    args: IS_SERVERLESS
      ? chromium.args
      : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: VIEWPORT,
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "load", timeout: TIMEOUT });
    await new Promise((resolve) => setTimeout(resolve, SETTLE_DELAY));

    const screenshot = await page.screenshot({ type: "png", fullPage: false });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}