import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import sharp from "sharp";
import redis from "@/app/lib/redis";

/** `viewport` is the landscape hero crop; `scroll` is the tall hover pan. */
export type PreviewVariant = "viewport" | "scroll";

// `v3` on scroll: the capture is now stitched from viewport tiles, collapses
// scroll-jacked sections, and rounds geometry. Earlier captures must not serve.
const CACHE_PREFIX: Record<PreviewVariant, string> = {
  viewport: "link-preview",
  scroll: "link-scroll-v3",
};

const BLOB_PATH: Record<PreviewVariant, string> = {
  viewport: "link-previews",
  scroll: "link-scrolls-v3",
};

/** One cache key per link + variant, independent of where it was posted. */
export const previewKey = (url: string, variant: PreviewVariant = "viewport") =>
  `${CACHE_PREFIX[variant]}:${createHash("sha1").update(url).digest("hex")}`;

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
  urls: string[],
  variant: PreviewVariant = "viewport"
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  if (unique.length === 0) return {};

  const map: Record<string, string> = {};

  // Upstash mget is happiest in modest batches.
  const CHUNK = 100;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const batch = unique.slice(i, i + CHUNK);
    const values = (await redis.mget(
      ...batch.map((url) => previewKey(url, variant))
    )) as (string | null)[];
    batch.forEach((url, index) => {
      const value = values?.[index];
      if (value) map[url] = value;
    });
  }

  return map;
}

/** Turn a raw capture into the stored WebP for its variant. */
async function encodePreview(
  png: Buffer,
  variant: PreviewVariant
): Promise<Buffer> {
  if (variant === "scroll") {
    // Tall and shown small: fixed width, keep the whole page, cheaper quality.
    // Narrower than the viewport crop because this one can be thousands of px
    // tall — width is what drives the file size here.
    return sharp(png)
      .resize({ width: 600 })
      .webp({ quality: 68, effort: 5 })
      .toBuffer();
  }

  // Shapes the image like briOS: 1200×630 cover cropped from the top so the
  // hero stays visible.
  return sharp(png)
    .resize(1200, 630, { fit: "cover", position: "top" })
    .webp({ quality: 82, effort: 5 })
    .toBuffer();
}

/**
 * Capture a link once, optimise it to a WebP, store it on Vercel Blob and
 * remember the URL. Repeat calls are a single cache read.
 */
export async function generatePreview(
  url: string,
  options: { refresh?: boolean; variant?: PreviewVariant } = {}
): Promise<string> {
  const variant = options.variant ?? "viewport";
  const key = previewKey(url, variant);

  // `refresh` skips the cache so a stale/broken stored image can be replaced.
  if (!options.refresh) {
    const cached = await redis.get<string>(key);
    if (cached) return cached;
  }

  // Loaded lazily so pages that only read the cache never pull in the browser.
  const png = await withTimeout(
    (async () => {
      const { captureScreenshot, captureScrollScreenshot } = await import(
        "@/lib/screenshot"
      );
      return variant === "scroll"
        ? captureScrollScreenshot(url)
        : captureScreenshot(url);
    })(),
    45_000,
    "capture timed out"
  );

  const webp = await encodePreview(png, variant);

  const blob = await put(`${BLOB_PATH[variant]}/${hashFor(url)}.webp`, webp, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  await redis.set(key, blob.url);
  return blob.url;
}
