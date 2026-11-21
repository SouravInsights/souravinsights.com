import { readFileSync } from "node:fs";
import Link from "next/link";
import { notFound } from "next/navigation";
import { join } from "node:path";
import styles from "../../page.module.css";

type RegistryFile = {
  path: string;
  type: string;
};

type RegistryItem = {
  name: string;
  type: string;
  title?: string;
  description?: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files?: RegistryFile[];
};

function registry(): { items: RegistryItem[] } {
  return JSON.parse(
    readFileSync(join(process.cwd(), "public", "r", "registry.json"), "utf8")
  ) as { items: RegistryItem[] };
}

function item(name: string): RegistryItem | null {
  try {
    return JSON.parse(
      readFileSync(join(process.cwd(), "public", "r", `${name}.json`), "utf8")
    ) as RegistryItem;
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return registry().items.map((entry) => ({ item: entry.name }));
}

export function generateMetadata({ params }: { params: { item: string } }) {
  const entry = item(params.item);
  return {
    title: entry?.title ? `${entry.title} — UI Kit` : "UI Kit",
    description: entry?.description,
  };
}

export default function Page({ params }: { params: { item: string } }) {
  const entry = item(params.item);
  if (!entry) notFound();

  const install = `npx shadcn@latest add https://ui.souravinsights.com/r/${entry.name}.json`;

  return (
    <main className={styles.doc}>
      <Link href="/" className={styles.back}>
        ← UI Kit
      </Link>

      <header className={styles.docHead}>
        <p className={styles.eyebrow}>{entry.type.replace("registry:", "")}</p>
        <h1>{entry.title ?? entry.name}</h1>
        {entry.description && (
          <p className={styles.docDesc}>{entry.description}</p>
        )}
        <pre className={styles.docCode}>
          <code>{install}</code>
        </pre>
      </header>

      <div className={styles.meta}>
        <section>
          <h2>Dependencies</h2>
          <ul>
            {(entry.dependencies ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
            {(entry.dependencies ?? []).length === 0 && <li>None</li>}
          </ul>
        </section>
        <section>
          <h2>Registry dependencies</h2>
          <ul>
            {(entry.registryDependencies ?? []).map((item) => (
              <li key={item}>{item.replace("https://ui.souravinsights.com/r/", "").replace(".json", "")}</li>
            ))}
            {(entry.registryDependencies ?? []).length === 0 && <li>None</li>}
          </ul>
        </section>
      </div>

      <section className={styles.files}>
        <h2>Files</h2>
        {(entry.files ?? []).map((file) => (
          <div key={file.path} className={styles.file}>
            <span>{file.path}</span>
            <span>{file.type.replace("registry:", "")}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
