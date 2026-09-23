import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import sharp from "sharp";
import redis from "@/app/lib/redis";

/** One cache key per link, independent of where it was posted. */
export const previewKey = (url: string) =>
  `link-preview:${createHash("sha1").update(url).digest("hex")}`;

const hashFor = (url: string) =>
  createHash("sha1").update(url).digest("hex");

/** Reject if `promise` hasn't settled within `ms`, so a stuck stage can't run
 *  past the route's serverless ceiling and get hard-killed. */
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

/**
 * Resolve already-captured preview URLs for a batch of links. This is what the
 * page server-renders, so a hover never has to hit a capture service — it just
 * points at a stored, immutable image.
 */
export async function getPreviewMap(
  urls: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  if (unique.length === 0) return {};

  const map: Record<string, string> = {};

  // Upstash mget is happiest in modest batches.
  const CHUNK = 100;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const batch = unique.slice(i, i + CHUNK);
    const values = (await redis.mget(...batch.map(previewKey))) as (
      | string
      | null
    )[];
    batch.forEach((url, index) => {
      const value = values?.[index];
      if (value) map[url] = value;
    });
  }

  return map;
}

/**
 * Capture a link once, optimise it to a wide WebP, store it on Vercel Blob and
 * remember the URL. Repeat calls are a single cache read. Shapes the image like
 * briOS: 1200×630 cover cropped from the top so the hero stays visible.
 */
export async function generatePreview(
  url: string,
  options: { refresh?: boolean } = {}
): Promise<string> {
  // `refresh` skips the cache so a stale/broken stored image can be replaced.
  if (!options.refresh) {
    const cached = await redis.get<string>(previewKey(url));
    if (cached) return cached;
  }

  // Loaded lazily so pages that only read the cache never pull in the browser.
  const png = await withTimeout(
    (async () => {
      const { captureScreenshot } = await import("@/lib/screenshot");
      return captureScreenshot(url);
    })(),
    45_000,
    "capture timed out"
  );

  const webp = await sharp(png)
    .resize(1200, 630, { fit: "cover", position: "top" })
    .webp({ quality: 82, effort: 5 })
    .toBuffer();

  const blob = await put(`link-previews/${hashFor(url)}.webp`, webp, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  await redis.set(previewKey(url), blob.url);
  return blob.url;
}