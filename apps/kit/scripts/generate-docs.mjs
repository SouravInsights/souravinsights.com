import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const registry = JSON.parse(
  readFileSync(join(root, "public", "r", "registry.json"), "utf8")
);

const registryRoot = join(root, "..", "..", "packages", "registry");

/** registry items that have a live demo in src/components/demos */
const demos = {
  highlight: "highlight-demo",
  "quote-share-dialog": "quote-dialog-demo",
};

const sources = {};

const base = join(root, "content", "docs", "components");
rmSync(base, { recursive: true, force: true });
mkdirSync(base, { recursive: true });

const groups = [
  { folder: "highlight", title: "Highlight", match: (item) => item.name.startsWith("highlight") },
  { folder: "quote", title: "Quote", match: (item) => item.name.startsWith("quote") },
  { folder: "blocks", title: "Blocks", match: (item) => item.type === "registry:block" },
  {
    folder: "primitives",
    title: "Primitives",
    match: (item) =>
      item.type === "registry:ui" &&
      !item.name.startsWith("highlight") &&
      !item.name.startsWith("quote"),
  },
  {
    folder: "libs",
    title: "Libs and hooks",
    match: (item) =>
      item.type === "registry:lib" || item.type === "registry:hook",
  },
];

const folders = [];

for (const group of groups) {
  const items = registry.items.filter(group.match);
  if (!items.length) continue;
  folders.push(group.folder);
  const dir = join(base, group.folder);
  mkdirSync(dir, { recursive: true });

  for (const item of items) {
    const deps = [
      ...(item.dependencies ?? []),
      ...(item.registryDependencies ?? []).map((dep) =>
        dep
          .replace("https://ui.souravinsights.com/r/", "")
          .replace(".json", "")
      ),
    ];

    const fileEntries = (item.files ?? []).map((file) => {
      let content = "";
      try {
        content = readFileSync(join(registryRoot, file.path), "utf8");
      } catch {
        content = "";
      }
      return { path: file.path, content };
    });

    sources[item.name] = fileEntries;

    const demo = demos[item.name];
    const preview = demo ? `<ComponentPreview name="${demo}" />\n\n` : "";

    const manual = fileEntries
      .map(
        (file) =>
          "### `" +
          file.path +
          "`\n\n```tsx\n" +
          file.content.replace(/```/g, "'''") +
          "\n```\n"
      )
      .join("\n");

    writeFileSync(
      join(dir, `${item.name}.mdx`),
      `---
title: ${JSON.stringify(item.title ?? item.name)}
description: ${JSON.stringify(item.description ?? "")}
---

${preview}## Installation

\`\`\`bash
npx shadcn@latest add https://ui.souravinsights.com/r/${item.name}.json
\`\`\`

## Dependencies

${deps.length ? deps.map((dep) => `- \`${dep}\``).join("\n") : "None."}

## Files

${(item.files ?? []).map((file) => `- \`${file.path}\``).join("\n")}

## Source

${manual}
`
    );
  }

  writeFileSync(
    join(dir, "meta.json"),
    JSON.stringify(
      { title: group.title, pages: items.map((item) => item.name).sort() },
      null,
      2
    )
  );
}

writeFileSync(
  join(base, "meta.json"),
  JSON.stringify({ title: "Components", pages: folders }, null, 2)
);

mkdirSync(join(root, "src", "generated"), { recursive: true });
writeFileSync(
  join(root, "src", "generated", "sources.json"),
  JSON.stringify(sources, null, 2)
);
