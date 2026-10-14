"use client";

import { ArrowUp, Square } from "lucide-react";
import React, { useEffect, useRef } from "react";

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
  onStop,
  busy,
  leading,
  compact = false,
  placeholder = "Ask about anything I've saved…",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  /**
   * A smaller box for a document page. The chat's composer is the main control
   * on its screen; on a shared conversation it is one line at the end of a
   * thread, and a chunky box there reads as the page's subject rather than its
   * footnote.
   */
  compact?: boolean;
  placeholder?: string;
  /** Session actions, tucked at the head of the box instead of floating loose
   *  above it: this row is where a chat keeps its controls. */
  leading?: React.ReactNode;
  /** Stop the answer that is streaming. Every chat has this, for the answer
   *  that is going the wrong way. */
  onStop?: () => void;
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
    // Keep the keyboard up: a chat is a run of questions, and having to tap the
    // box again between each one is the thing that makes a phone chat feel slow.
    textareaRef.current?.focus();
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
      className={`flex items-end rounded-lg border border-border bg-card transition-colors focus-within:border-input focus-within:ring-2 focus-within:ring-ring/30 ${
        compact ? "gap-1.5 p-1.5" : "gap-2 p-2"
      }`}
    >
      {leading}
      {/* `min-h-9` matches the send button's height, so an empty box is exactly as
          tall as the button and both centre on the same line. Without it the
          single-line textarea comes out ~1px shorter, `items-end` bottom-aligns
          the two, and the placeholder sits off the box's centre. */}
      <textarea
        ref={textareaRef}
        value={value}
        rows={1}
        maxLength={2000}
        // React's types have not caught up with enterkeyhint; the DOM does, and
        // it is what turns a phone keyboard's Enter key into "send".
        {...({ enterkeyhint: "send" } as unknown as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        spellCheck={false}
        aria-label="Ask Curio"
        placeholder={placeholder}
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
        className={`max-h-40 min-w-0 flex-1 resize-none bg-transparent leading-relaxed outline-none placeholder:text-faint-foreground sm:text-sm ${
          compact ? "min-h-8 px-1.5 py-1 text-[15px]" : "min-h-9 px-2 py-1.5 text-base"
        }`}
      />
      {busy && onStop ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop"
          className={`flex shrink-0 items-center justify-center border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 ${
            compact ? "h-8 w-8 rounded-md" : "h-9 w-9 rounded-lg"
          }`}
        >
          <Square className={compact ? "h-3 w-3 fill-current" : "h-3.5 w-3.5 fill-current"} />
        </button>
      ) : (
        <button
          type="submit"
          disabled={busy || !value.trim()}
          aria-label="Ask"
          className={`flex shrink-0 items-center justify-center border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-40 ${
            compact ? "h-8 w-8 rounded-md" : "h-9 w-9 rounded-lg"
          }`}
        >
          <ArrowUp className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
      )}
    </form>
  );
}
