"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Check, Copy, DownloadSimple, GithubLogo } from "@phosphor-icons/react";

const ITEMS = [
  {
    id: "highlight",
    label: "Highlight",
    url: "https://ui.souravinsights.com/r/highlight.json",
  },
  {
    id: "studio",
    label: "Studio",
    url: "https://ui.souravinsights.com/r/quote-share-dialog.json",
  },
] as const;

const REPO = "https://github.com/SouravInsights/souravinsights.com";

export function InstallCard() {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const item = ITEMS[index];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`npx shadcn@latest add ${item.url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the command stays selectable.
    }
  };

  return (
    <div className="install">
      <div className="install-card">
        <div className="install-tabs" role="tablist" aria-label="Item">
          <span
            aria-hidden="true"
            className="install-tab-indicator"
            style={{ transform: `translateX(${index * 100}%)` }}
          />
          {ITEMS.map((entry, i) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              data-active={i === index ? "" : undefined}
              onClick={() => setIndex(i)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="install-command">
          <code>
            <span className="cmd-prog">
              <span className="cmd-prompt" aria-hidden="true">
                $
              </span>{" "}
              npx shadcn@latest add
            </span>
            <span className="cmd-url">{item.url}</span>
          </code>
          <button
            type="button"
            className="install-copy"
            data-copied={copied ? "" : undefined}
            onClick={copy}
            aria-label={copied ? "Copied" : "Copy command"}
          >
            {copied ? (
              <Check aria-hidden="true" className="size-3.5" />
            ) : (
              <Copy aria-hidden="true" className="size-3.5" />
            )}
          </button>
        </div>
      </div>

      <nav aria-label="Links" className="install-links">
        <Link href="/docs">
          <BookOpen aria-hidden="true" />
          Docs
        </Link>
        <Link href="/docs/installation">
          <DownloadSimple aria-hidden="true" />
          Install
        </Link>
        <a href={REPO} rel="noreferrer">
          <GithubLogo aria-hidden="true" weight="fill" />
          GitHub
        </a>
      </nav>
    </div>
  );
}
