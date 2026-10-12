"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Copies a snippet to the clipboard.
 *
 * Documentation is read and then acted on, and the acting part is "paste this
 * into a terminal". Without this, copying a curl example means dragging a
 * selection across a horizontally scrolled block, which is the one place a
 * docs page can waste somebody's minute.
 *
 * Two details worth keeping: the confirmation reverts on its own, so the
 * button never claims a stale state, and a blocked clipboard stays silent
 * rather than lying about having copied.
 */
export function CopyButton({
  value,
  label,
  iconOnly = false,
  className,
  onCopied,
}: {
  value: string;
  label: string;
  /** Icon alone — for tight surfaces like a list row. */
  iconOnly?: boolean;
  /** Extra classes; the caller owns visibility and tone when iconOnly. */
  className?: string;
  /** Fires after a successful copy (haptics, sounds). */
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onCopied?.();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Insecure origin, or the permission was refused. Say nothing.
    }
  }, [value, onCopied]);

  const Icon = copied ? Check : Copy;

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void copy();
        }}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        title={copied ? "Copied" : `Copy ${label}`}
        className={`flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:text-foreground ${className ?? ""}`}
      >
        <Icon
          aria-hidden="true"
          className={`h-3.5 w-3.5 ${copied ? "text-green-600" : ""}`}
        />
        <span aria-live="polite" className="sr-only">
          {copied ? `${label} copied to clipboard` : ""}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className="-mr-1 inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {copied ? "Copied" : "Copy"}
      <span aria-live="polite" className="sr-only">
        {copied ? `${label} copied to clipboard` : ""}
      </span>
    </button>
  );
}
