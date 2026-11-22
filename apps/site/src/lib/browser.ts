import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser, type Viewport } from "puppeteer-core";

/**
 * Shared headless-Chromium bootstrap. Two callers need a real browser:
 * link-preview screenshots (`screenshot.ts`) and KB extraction of JS-heavy
 * pages (`kb/render.ts`). This is the one place that knows how to find and
 * launch a browser in both environments.
 */

const LAUNCH_TIMEOUT = 20_000;

const IS_SERVERLESS =
  !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

/** Where Chromium lives: bundled on serverless, a system Chrome locally. */
export async function getExecutablePath(): Promise<string> {
  if (IS_SERVERLESS) return chromium.executablePath();

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

/** Launch a headless Chromium. The caller is responsible for closing it. */
export async function launchBrowser(defaultViewport?: Viewport): Promise<Browser> {
  const executablePath = process.env.CHROME_PATH || (await getExecutablePath());

  return puppeteer.launch({
    args: IS_SERVERLESS
      ? chromium.args
      : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    executablePath,
    headless: true,
    timeout: LAUNCH_TIMEOUT,
    ...(defaultViewport ? { defaultViewport } : {}),
  });
}
