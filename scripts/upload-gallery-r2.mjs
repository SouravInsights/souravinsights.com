/**
 * Uploads the optimised gallery masters to Cloudflare R2 and registers them in
 * Postgres, so adding a clip is one command.
 *
 * Layout in the bucket is one folder per project, named from the file's own
 * prefix (`beenthere-…` → `beenthere/…`):
 *
 *   beenthere/beenthere-editor-experience.mp4
 *   beenthere/beenthere-editor-experience-poster.webp
 *   spotfree/spotfree-icon-animations.mp4
 *
 * Registration inserts a `gallery_projects` row for a new prefix and one
 * `gallery_videos` row per clip, with the facts read from the file (dimensions,
 * duration, whether it has sound) and a title from the filename. Title, notes
 * and tags are then edited in the gallery UI. Existing rows are left alone, so
 * re-running never clobbers an edit.
 *
 * Reads `R2_*` and `DATABASE_URL` from `.env`.
 * Run: `node scripts/upload-gallery-r2.mjs`.
 * Originals are never touched; this only reads the optimised directory.
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { AwsClient } from "aws4fetch";
import { neon } from "@neondatabase/serverless";

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
const originals = source.replace(/optimized-recordings\/?$/, "og-recordings");

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
const prettify = (stem) =>
  stem.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** The original's date is the recording date; the encode's is only when it ran. */
const recordedOn = (file) => {
  const original = join(originals, file);
  const path = existsSync(original) ? original : join(source, file);
  return statSync(path).mtime.toISOString().slice(0, 10);
};

const probe = (path) => {
  const out = JSON.parse(
    execFileSync("ffprobe", [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_streams",
      "-show_format",
      path,
    ]).toString()
  );
  const video = out.streams.find((stream) => stream.codec_type === "video");
  return {
    width: video?.width ?? 1600,
    height: video?.height ?? 1000,
    duration: Number(out.format?.duration ?? 0),
    hasAudio: out.streams.some((stream) => stream.codec_type === "audio"),
  };
};

const files = readdirSync(source)
  .filter((name) => name.endsWith(".mp4") || name.endsWith(".webp"))
  .sort();
const clips = files.filter((name) => name.endsWith(".mp4"));

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
  console.log(`✓ ${key}  ${(size / 1e6).toFixed(2)} MB`);
}

console.log(
  `\n${uploaded} objects, ${(bytes / 1e6).toFixed(1)} MB → ${R2_BUCKET}`
);
console.log(`Public base: ${R2_PUBLIC_URL}`);

if (!process.env.DATABASE_URL) {
  console.warn("\nDATABASE_URL not set — skipped registration.");
  process.exit(0);
}

const sql = neon(process.env.DATABASE_URL);
console.log("\nRegistering clips…");

for (const file of clips) {
  const stem = file.replace(/\.mp4$/, "");
  const project = projectOf(file);
  const meta = probe(join(source, file));

  // A project row for the prefix, if this is a new one. Name is a placeholder
  // from the key; it is corrected in the database.
  await sql`insert into gallery_projects (key, name, position)
    values (${project}, ${prettify(project)}, coalesce((select max(position) from gallery_projects), -1) + 1)
    on conflict (key) do nothing`;

  const inserted = await sql`insert into gallery_videos
      (id, project, video_key, poster_key, title, notes, width, height, duration, sound, recorded_at, position)
    values (
      ${stem}, ${project}, ${`${project}/${file}`}, ${`${project}/${stem}-poster.webp`},
      ${prettify(stem)}, '', ${meta.width}, ${meta.height}, ${meta.duration},
      ${meta.hasAudio}, ${recordedOn(file)},
      coalesce((select max(position) from gallery_videos), -1) + 1
    )
    on conflict (id) do nothing
    returning id`;

  console.log(
    inserted.length ? `+ ${stem}` : `= ${stem} (already registered)`
  );
}
