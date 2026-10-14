"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Copy, as a real button.
 *
 * One component because it appears in three places — each answer, the whole
 * transcript, and a shared page — and three copies of a clipboard handler is
 * three chances for one of them to stop working. It says what it did for two
 * seconds and then goes back to saying what it does.
 */
export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  className,
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          .writeText(text)
          .then(() => setCopied(true))
          .catch(() => undefined);
      }}
      className={
        className ??
        "inline-flex h-8 items-center gap-1.5 rounded-md px-2 type-caption text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      }
      aria-label={copied ? copiedLabel : label}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? copiedLabel : label}
    </button>
  );
}

/** Markdown for one answer, sources included, so a paste keeps its links. */
export function answerAsMarkdown(
  text: string,
  sources: { title: string; url: string }[]
): string {
  if (!sources.length) return text;
  return [
    text,
    "",
    "Sources:",
    ...sources.map((source) => `- [${source.title || source.url}](${source.url})`),
  ].join("\n");
}
