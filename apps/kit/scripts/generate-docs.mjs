import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { registryDocs } from "./registry-docs.mjs";

const root = process.cwd();
const registry = JSON.parse(
  readFileSync(join(root, "public", "r", "registry.json"), "utf8")
);

const registryRoot = join(root, "..", "..", "packages", "registry");

/** registry items that have a live demo in src/components/demos */
const demos = {
  highlight: "highlight-demo",
  "highlight-anchor": "highlight-anchor-demo",
  "highlight-palette": "highlight-palette-demo",
  "highlight-wave": "highlight-wave-demo",
  "use-text-selection": "use-text-selection-demo",
  "use-reduced-motion": "use-reduced-motion-demo",
  "quote-share-dialog": "quote-dialog-demo",
  "quote-actions": "quote-actions-demo",
  "quote-carousel": "quote-carousel-demo",
  "quote-options": "quote-options-demo",
  "quote-card": "quote-card-demo",
  "quote-variant-picker": "quote-variant-picker-demo",
  "quote-presets": "quote-presets-demo",
  "quote-themes": "quote-themes-demo",
  "quote-render": "quote-render-demo",
  "article-highlights": "article-highlights-demo",
  "quote-share": "quote-share-demo",
  "anchored-panel": "anchored-panel-demo",
  canvas: "canvas-demo",
  "color-field": "color-field-demo",
  "color-picker": "color-picker-demo",
  "inline-edit-field": "inline-edit-field-demo",
  "marker-rail": "marker-rail-demo",
  "side-panel": "side-panel-demo",
  "snap-carousel": "snap-carousel-demo",
  swatch: "swatch-demo",
};

/**
 * The docs tree, mirroring shadcn: one flat, alphabetical list of components,
 * then the blocks and the utilities. Nothing nests a component under the
 * component it belongs to.
 */
const sections = [
  {
    folder: "components",
    title: "Components",
    match: (item) => item.type === "registry:ui",
  },
  {
    folder: "blocks",
    title: "Blocks",
    match: (item) => item.type === "registry:block",
  },
  {
    folder: "utilities",
    title: "Utilities",
    match: (item) => item.type === "registry:lib" || item.type === "registry:hook",
  },
];

const sources = {};
const docs = join(root, "content", "docs");

for (const section of sections) {
  const dir = join(docs, section.folder);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

for (const section of sections) {
  const items = registry.items
    .filter(section.match)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!items.length) continue;
  const dir = join(docs, section.folder);

  for (const item of items) {
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
    if (demo) {
      sources[demo] = [
        {
          path: `src/components/demos/${demo}.tsx`,
          content: readFileSync(
            join(root, "src", "components", "demos", `${demo}.tsx`),
            "utf8"
          ),
        },
      ];
    }

    const npmDeps = item.dependencies ?? [];
    const authored = registryDocs[item.name] ?? {};

    const preview = demo ? `<ComponentPreview name="${demo}" />\n\n` : "";
    const usage = authored.usage ? `\n## Usage\n\n${authored.usage}\n` : "";

    const examples = (authored.examples ?? [])
      .map(
        (example) =>
          `### ${example.title}\n\n${
            example.description ? `${example.description}\n\n` : ""
          }<ComponentPreview name="${example.name}" />`
      )
      .join("\n\n");
    const examplesSection = examples ? `\n## Examples\n\n${examples}\n` : "";

    const depsStep = npmDeps.length
      ? `<Step>Install the following dependencies:</Step>

\`\`\`bash
npm install ${npmDeps.join(" ")}
\`\`\`
`
      : "";

    writeFileSync(
      join(dir, `${item.name}.mdx`),
      `---
title: ${JSON.stringify(item.title ?? item.name)}
description: ${JSON.stringify(item.description ?? "")}
---

${preview}## Installation

<Tabs defaultValue="cli">
<TabsList>
<TabsTrigger value="cli">Command</TabsTrigger>
<TabsTrigger value="manual">Manual</TabsTrigger>
</TabsList>
<TabsContent value="cli">

\`\`\`bash
npx shadcn@latest add https://ui.souravinsights.com/r/${item.name}.json
\`\`\`

</TabsContent>
<TabsContent value="manual">

<Steps>
${depsStep}
<Step>Copy and paste the following code into your project.</Step>

<ComponentSource name="${item.name}" />

<Step>Update the import paths to match your project setup.</Step>
</Steps>

</TabsContent>
</Tabs>
${usage}${examplesSection}`
    );
  }

  writeFileSync(
    join(dir, "meta.json"),
    JSON.stringify(
      { title: section.title, pages: items.map((item) => item.name) },
      null,
      2
    )
  );
}

writeFileSync(
  join(docs, "meta.json"),
  JSON.stringify(
    {
      title: "Documentation",
      pages: [
        "index",
        "installation",
        "examples",
        "components",
        "blocks",
        "utilities",
      ],
    },
    null,
    2
  )
);

mkdirSync(join(root, "src", "generated"), { recursive: true });
writeFileSync(
  join(root, "src", "generated", "sources.json"),
  JSON.stringify(sources, null, 2)
);
