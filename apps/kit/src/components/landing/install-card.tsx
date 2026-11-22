"use client";

import { useState } from "react";
import Link from "next/link";

const COMMAND = "npx shadcn@latest add https://ui.souravinsights.com/r/highlight.json";
const REPO = "https://github.com/SouravInsights/souravinsights.com";

export function InstallCard() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the command stays selectable.
    }
  };

  return (
    <div className="install-card">
      <div className="install-row">
        <code>{COMMAND}</code>
        <button type="button" onClick={copy} aria-label={copied ? "Copied" : "Copy command"}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="install-links">
        <Link href="/docs">Docs</Link>
        <Link href="/docs/installation">Install</Link>
        <a href={REPO} rel="noreferrer">
          GitHub
        </a>
      </div>
    </div>
  );
}
