"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Suggestion } from "@/components/ai-elements/suggestion";

/**
 * The Ask panel — the public agent on top of the knowledge base.
 *
 * Two things this deliberately does:
 * - Answers render as markdown (MessageResponse → Streamdown), so lists,
 *   links and code in a reply actually look like what they are.
 * - Citations come from the search tool's OUTPUT, never from the model's
 *   prose, so a made-up URL has nowhere to appear.
 */

interface Match {
  url: string;
  title: string;
  channel: string;
  passage: string;
}

/**
 * Chips are supplied by the server (see `src/lib/kb/suggestions.ts`), derived
 * from the collection so every category is covered and the wording stays a
 * need rather than a title-echo.
 */
interface AskPanelProps {
  suggestions: string[];
}

/** Fisher-Yates. Unseeded on purpose — we want a different order per visit. */
function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pixels per second the chip row drifts. Slow enough to read and to click. */
const DRIFT_PX_PER_SEC = 30;

/**
 * Drift the chip row sideways while leaving it scrollable by hand.
 *
 * A translate-based marquee cannot do both: it clones its children and clips
 * the overflow, so there is nothing for a wheel or a drag to move. Nudging a
 * native scroll container each frame gives the same drift, keeps the browser's
 * own scrolling, and loops by reversing at each end instead of jumping.
 */
function useAutoScroll(ref: RefObject<HTMLDivElement | null>, playing: boolean) {
  useEffect(() => {
    const row = ref.current;
    if (!row || !playing) return;

    let frame = 0;
    let last = performance.now();
    let direction = 1;

    const step = (now: number) => {
      const elapsed = now - last;
      last = now;

      const max = row.scrollWidth - row.clientWidth;
      if (max > 0) {
        row.scrollLeft += (DRIFT_PX_PER_SEC * elapsed * direction) / 1000;
        if (row.scrollLeft >= max) direction = -1;
        else if (row.scrollLeft <= 0) direction = 1;
      }

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [ref, playing]);
}

type Part = {
  type: string;
  state?: string;
  text?: string;
  input?: { query?: string };
  output?: unknown;
};

/**
 * What the agent is doing *right now*.
 *
 * Without this the panel is a blank box for ~10 seconds, because the answer only
 * starts streaming after the model has decided to search, the search has run,
 * and the model has produced its first token. The tool part's `state` maps
 * exactly onto those waits:
 *   input-streaming → the model is still emitting the call  ("Thinking…")
 *   input-available  → we're running the search             ("Searching for …")
 *   output-available → the model is composing the answer    ("Writing…")
 * Returns null once answer text starts arriving.
 */
function phaseOf(parts: Part[]): string | null {
  if (parts.some((part) => part.type === "text" && part.text)) return null;
  const tool = parts.find((part) => part.type === "tool-search_knowledge");
  if (!tool || tool.state === "input-streaming") return "Thinking…";
  if (tool.state === "input-available") {
    const query = tool.input?.query;
    return query ? `Searching for “${query}”…` : "Searching the collection…";
  }
  return "Writing…";
}

/** Every link the search tool returned in this message. */
function citationsOf(parts: { type: string; state?: string; output?: unknown }[]) {
  const seen = new Set<string>();
  const out: Match[] = [];
  for (const part of parts) {
    if (part.type !== "tool-search_knowledge" || part.state !== "output-available") {
      continue;
    }
    const matches = (part.output as { matches?: Match[] } | undefined)?.matches ?? [];
    for (const match of matches) {
      if (seen.has(match.url)) continue;
      seen.add(match.url);
      out.push(match);
    }
  }
  return out;
}

export function AskPanel({ suggestions }: AskPanelProps) {
  const [input, setInput] = useState("");
  const [chips, setChips] = useState<string[]>(suggestions);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // Shuffle once per visit so the same chips aren't always first. Done on mount
  // rather than during render, so server and client agree on the first paint.
  useEffect(() => setChips(shuffled(suggestions)), [suggestions]);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/insights/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  // The live phase shown while we wait: derived from the newest assistant
  // message, so it works during `submitted` (no message yet) and `streaming`.
  const lastParts = (messages.filter((m) => m.role === "assistant").at(-1)?.parts ??
    []) as Part[];
  const phase = busy ? phaseOf(lastParts) : null;

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    sendMessage({ text: value });
    setInput("");
  };

  // Pause while the pointer or keyboard focus is on the row — a moving target
  // you can't click is worse than a static one.
  const playing = !hovered && !focused && !reduceMotion;

  const rowRef = useRef<HTMLDivElement>(null);
  useAutoScroll(rowRef, playing);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-background">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-4 py-3">
        <Sparkles className="h-4 w-4 text-green-700 dark:text-green-500" />
        <h2 className="type-body font-medium text-foreground">Ask the collection</h2>
        <span className="type-caption text-faint-foreground">
          answers come only from saved links
        </span>
      </header>

      {/* Only reserve scroll height once there's a conversation — an empty
          384px box would outrank the actual content on first paint. */}
      <Conversation className={messages.length > 0 ? "h-96" : undefined}>
        <ConversationContent className="gap-5 p-4">
          {messages.length === 0 && (
            <p className="type-caption text-faint-foreground">
              Ask a question, or tap a suggestion below.
            </p>
          )}

          {messages.map((message) => {
            const text = message.parts
              .filter((part) => part.type === "text")
              .map((part) => (part as { text: string }).text)
              .join("");
            const citations = citationsOf(
              message.parts as { type: string; state?: string; output?: unknown }[]
            );

            return (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.role === "assistant" ? (
                    <>
                      {text && <MessageResponse>{text}</MessageResponse>}
                      {citations.length > 0 && (
                        <Sources defaultOpen>
                          <SourcesTrigger count={citations.length} />
                          <SourcesContent>
                            {citations.map((citation) => (
                              <Source
                                key={citation.url}
                                href={citation.url}
                                title={citation.title}
                              />
                            ))}
                          </SourcesContent>
                        </Sources>
                      )}
                    </>
                  ) : (
                    text
                  )}
                </MessageContent>
              </Message>
            );
          })}

          {phase && (
            <div className="flex items-center gap-2 text-faint-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="type-caption">{phase}</span>
            </div>
          )}

          {error && (
            <p className="type-caption text-red-600">
              Something went wrong — try again in a moment.
            </p>
          )}
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
            className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

