/**
 * Uploads the optimised gallery masters to Cloudflare R2.
 *
 * Layout in the bucket is one folder per project, named from the file's own
 * prefix (`beenthere-…` → `beenthere/…`), so the key always matches the clip it
 * belongs to:
 *
 *   beenthere/beenthere-editor-experience.mp4
 *   beenthere/beenthere-editor-experience-poster.webp
 *   spotfree/spotfree-icon-animations.mp4
 *
 * Reads `R2_*` from `.env`. Run: `node scripts/upload-gallery-r2.mjs`.
 * Originals are never touched; this only reads the optimised directory.
 */
import "dotenv/config";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { AwsClient } from "aws4fetch";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
} = process.env;

const missing = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
].filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing env: ${missing.join(", ")}`);
  process.exit(1);
}

const source =
  process.env.GALLERY_SRC ??
  "/Users/souravinsights/Documents/Personal/souravinsights-assets/optimized-recordings";

const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const client = new AwsClient({
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
});

/** `spotfree-page-builder-ui.mp4` → `spotfree`. */
const projectOf = (name) => name.split("-")[0];
const contentType = (name) =>
  name.endsWith(".webp") ? "image/webp" : "video/mp4";

const files = readdirSync(source)
  .filter((name) => name.endsWith(".mp4") || name.endsWith(".webp"))
  .sort();

let uploaded = 0;
let bytes = 0;

for (const file of files) {
  const path = join(source, file);
  const key = `${projectOf(file)}/${file}`;
  const size = statSync(path).size;
  const response = await client.fetch(`${endpoint}/${R2_BUCKET}/${key}`, {
    method: "PUT",
    body: readFileSync(path),
    // A clip can be re-uploaded under the same key (a re-encode), so this is
    // a normal media cache rather than `immutable` — otherwise an old file
    // would outlive its replacement for a year.
    headers: {
      "Content-Type": contentType(file),
      "Cache-Control": "public, max-age=3600",
    },
  });

  if (!response.ok) {
    console.error(`\n✗ ${key} → ${response.status}`);
    console.error(await response.text());
    process.exit(1);
  }

  uploaded += 1;
  bytes += size;
  console.log(
    `✓ ${key}  ${(size / 1e6).toFixed(2)} MB`
  );
}

console.log(
  `\n${uploaded} objects, ${(bytes / 1e6).toFixed(1)} MB → ${R2_BUCKET}`
);
console.log(`Public base: ${R2_PUBLIC_URL}`);
