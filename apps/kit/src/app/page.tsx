import { readFileSync } from "node:fs";
import { join } from "node:path";
import styles from "./page.module.css";

type RegistryItem = {
  name: string;
  type: string;
  title?: string;
  description?: string;
};

function registry(): { items: RegistryItem[] } {
  const path = join(process.cwd(), "public", "r", "registry.json");
  return JSON.parse(readFileSync(path, "utf8")) as { items: RegistryItem[] };
}

export default function Page() {
  const { items } = registry();
  const groups = [
    { label: "Highlight", match: (item: RegistryItem) => item.name.startsWith("highlight") },
    { label: "Quote", match: (item: RegistryItem) => item.name.startsWith("quote") },
    {
      label: "Primitives",
      match: (item: RegistryItem) =>
        item.type === "registry:ui" &&
        !item.name.startsWith("highlight") &&
        !item.name.startsWith("quote"),
    },
    {
      label: "Libs and hooks",
      match: (item: RegistryItem) =>
        item.type === "registry:lib" || item.type === "registry:hook",
    },
  ];

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Sourav Insights</p>
        <h1>UI Kit</h1>
        <p className={styles.lede}>
          Highlight text, pick a hue, share a quote card. Copy the source with the
          shadcn CLI and own it.
        </p>
        <pre>
          <code>npx shadcn@latest add https://ui.souravinsights.com/r/highlight.json</code>
        </pre>
        <p className="note">
          Built on Radix primitives. If your project is on Base UI, initialize
          with <code>npx shadcn@latest init -b radix</code> first.
        </p>
      </header>

      {groups.map((group) => {
        const groupItems = items.filter(group.match);
        if (groupItems.length === 0) return null;
        return (
          <section key={group.label} className={styles.group}>
            <h2>{group.label}</h2>
            <div className={styles.items}>
              {groupItems.map((item) => (
                <a
                  key={item.name}
                  className={styles.item}
                  href={`https://ui.souravinsights.com/r/${item.name}.json`}
                >
                  <span className={styles.itemTitle}>{item.title ?? item.name}</span>
                  {item.description && (
                    <span className={styles.itemDesc}>{item.description}</span>
                  )}
                  <span className={styles.itemName}>r/{item.name}.json</span>
                </a>
              ))}
            </div>
          </section>
        );
      })}

      <footer className={styles.footer}>
        Source lives in <code>packages/registry</code>. Install, then edit.
      </footer>
    </main>
  );
}
