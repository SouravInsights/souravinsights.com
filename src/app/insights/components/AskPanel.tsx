"use client";

import { ArrowUp, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { Curio } from "@/components/curio/Curio";
import { CurioIntro, CurioTranscript } from "@/components/curio/CurioConversation";
import { useChipDrift } from "@/components/curio/use-chip-drift";
import { shuffled, useCurioChat } from "@/components/curio/use-curio-chat";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/**
 * The Ask panel — Curio at card size, inside the /insights page.
 *
 * The plumbing (chat, phase, citations, the transcript, the intro) comes from
 * `@/components/curio`, the same code the full page at /curio uses, so the rule
 * that an answer may only cite what a tool returned is written down once.
 *
 * What is deliberately different here, and only here:
 * - The panel keeps the page's scroll. It is one block on a page about
 *   something else, so it never takes the viewport.
 * - It reserves no height until a conversation exists — an empty 384px box would
 *   outrank the actual content on first paint.
 * - One chip row, reversing at its ends rather than looping. Three looping lanes
 *   belong to the full page, where there is room for them.
 */

interface AskPanelProps {
  suggestions: string[];
}

export function AskPanel({ suggestions }: AskPanelProps) {
  const { messages, busy, error, phase, input, setInput, submit } = useCurioChat();
  const [chips, setChips] = useState(suggestions);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Shuffle once per visit so the same chips aren't always first, and on mount
  // rather than during render so server and client agree on the first paint.
  useEffect(() => setChips(shuffled(suggestions)), [suggestions]);

  // Pause while the pointer or keyboard focus is on the row — a moving target
  // you can't click is worse than a static one.
  const playing = !hovered && !focused && !reduceMotion;
  const rowRef = useRef<HTMLDivElement>(null);
  useChipDrift(rowRef, { playing });

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-background">
      {/* The identity bar, the way a chat product's top bar works: the mark and
          the name on the left, what it answers from beside it, and the way to the
          full page on the right.

          `size={30}` and `still`: 30 because the drawing is wider than tall
          (52.7 x 44.9 in its own box) so the square element is bigger than the
          bot you see; still because this mark sits beside a heading you are
          reading, while the hero below is the one that taps. The busy breath
          still runs here — it is this mark's reason to exist. */}
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-4 py-3">
        <Curio size={30} busy={busy} still />
        <h2 className="type-body font-medium text-foreground">Curio</h2>
        <span className="type-caption text-faint-foreground">
          answers come only from saved links
        </span>
        <Link
          href="/curio"
          className="type-caption ml-auto inline-flex shrink-0 items-center gap-1 rounded-sm text-muted-foreground transition-colors hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700/40 dark:hover:text-green-500"
        >
          Open full page
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </header>

      <Conversation className={messages.length > 0 ? "h-96" : undefined}>
        <ConversationContent className="gap-5 p-4">
          {messages.length === 0 && <CurioIntro size={64} />}

          <CurioTranscript messages={messages} phase={phase} error={error} />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div
        className="border-t border-border px-4 pt-3"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          // Only resume once focus has actually left the row.
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setFocused(false);
          }
        }}
      >
        {/* Edges fade so it's clear the row keeps going. */}
        <div className="suggestions-fade">
          {/* A native horizontal scroller: the drift nudges this, and a wheel,
              a drag or an arrow key moves it by hand. Scrollbar hidden. */}
          <div
            ref={rowRef}
            className="no-scrollbar flex flex-nowrap items-center gap-2 overflow-x-auto pb-1"
          >
            {chips.map((suggestion) => (
              <Suggestion
                key={suggestion}
                suggestion={suggestion}
                onClick={submit}
                disabled={busy}
                className="type-caption shrink-0"
              />
            ))}
          </div>
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
        className="flex items-center gap-2 px-4 pb-4 pt-2"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about anything I've saved…"
          spellCheck={false}
          aria-label="Ask about the collection"
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 text-base outline-none transition-colors placeholder:text-faint-foreground focus:border-input focus:ring-2 focus:ring-ring/30 sm:h-9 sm:text-sm"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Ask"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-40 sm:h-9 sm:w-9"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
