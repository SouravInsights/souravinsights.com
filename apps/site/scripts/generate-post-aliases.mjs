import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Rebuild `src/content/post-aliases.json` from git's own rename history.
 *
 * Renaming a post used to orphan its Redis view/like keys and 404 the old URL.
 * Rather than keep a hand-written old -> new list (which no one remembers to
 * update), this reads the renames straight out of git — the same record the
 * commit already carries — and turns each one into a redirect and a stat
 * lookup. A rename is then just a `git mv` and a push; nothing else to edit.
 *
 * Wired into `predev` and `prebuild`, so it runs before every dev server and
 * every deploy. Existing entries are merged, never dropped, so a shallow clone
 * on the build host cannot erase renames it can no longer see. If git is not
 * available the file is left untouched and the build continues.
 */

const POSTS_DIR = "src/content/posts";
const aliasesPath = path.join(process.cwd(), "src/content/post-aliases.json");

function readExisting() {
  if (!existsSync(aliasesPath)) return {};
  try {
    return JSON.parse(readFileSync(aliasesPath, "utf8"));
  } catch {
    return {};
  }
}

/** Every rename git knows about, as old-slug -> new-slug edges. */
function detectRenames() {
  try {
    const output = execFileSync(
      "git",
      [
        "log",
        "--diff-filter=R",
        "--find-renames=40%",
        "--name-status",
        "--format=",
        "--",
        POSTS_DIR,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );

    const edges = {};
    for (const rawLine of output.split("\n")) {
      const line = rawLine.trim();
      if (!line.startsWith("R")) continue;

      const [, oldPath, newPath] = line.split(/\s+/);
      if (!oldPath || !newPath) continue;

      const oldSlug = path.basename(oldPath, ".mdx");
      const newSlug = path.basename(newPath, ".mdx");
      if (oldSlug && newSlug && oldSlug !== newSlug) edges[oldSlug] = newSlug;
    }

    return edges;
  } catch {
    return {};
  }
}

/** Collapse rename chains so every old slug points at the slug in use today. */
function flatten(edges) {
  const resolve = (slug) => {
    let current = slug;
    const seen = new Set();
    while (edges[current] && !seen.has(current)) {
      seen.add(current);
      current = edges[current];
    }
    return current;
  };

  const flat = {};
  for (const from of Object.keys(edges)) {
    const to = resolve(from);
    if (to !== from) flat[from] = to;
  }
  return flat;
}

const merged = flatten({ ...readExisting(), ...detectRenames() });
const sorted = Object.fromEntries(
  Object.keys(merged)
    .sort()
    .map((from) => [from, merged[from]])
);
const nextContents = `${JSON.stringify(sorted, null, 2)}\n`;
const currentContents = existsSync(aliasesPath)
  ? readFileSync(aliasesPath, "utf8")
  : "";

if (nextContents !== currentContents) {
  writeFileSync(aliasesPath, nextContents);
  console.log(`generate-post-aliases: wrote ${aliasesPath}`);
}
