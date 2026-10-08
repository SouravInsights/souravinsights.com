"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * The composer for the full page.
 *
 * A textarea rather than the panel's single-line input, because this is where a
 * real conversation happens: it grows to five lines and then scrolls, Enter
 * sends, Shift+Enter breaks the line. Both are what every chat app on a phone
 * does, and neither is discoverable from a one-line box.
 *
 * The panel keeps its compact input on purpose — it is a row in a card, and a
 * growing box there would push the card's own content around as you type.
 */
export function CurioComposer({
  value,
  onChange,
  onSubmit,
  busy,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  busy: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow with the content up to the cap, then scroll. Height is reset to auto
  // first, or the box could never shrink back after a line was deleted.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const send = () => {
    if (busy || !value.trim()) return;
    onSubmit(value);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
      className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 transition-colors focus-within:border-input focus-within:ring-2 focus-within:ring-ring/30"
    >
      <textarea
        ref={textareaRef}
        value={value}
        rows={1}
        spellCheck={false}
        aria-label="Ask Curio"
        placeholder="Ask about anything I've saved…"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends, Shift+Enter is a newline. While an answer is streaming
          // the send is swallowed rather than queued — a second question landing
          // on top of a half-written first one helps nobody.
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
          }
        }}
        className="max-h-40 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-base leading-relaxed outline-none placeholder:text-faint-foreground sm:text-sm"
      />
      <button
        type="submit"
        disabled={busy || !value.trim()}
        aria-label="Ask"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-40"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </form>
  );
}
