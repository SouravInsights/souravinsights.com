"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowBendDownRight,
  ArrowUp,
  Square,
  X,
} from "@phosphor-icons/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Curio } from "@/components/curio/Curio";
import { CurioTranscript } from "@/components/curio/CurioConversation";
import {
  phaseOf,
  type Part,
} from "@/components/curio/use-curio-chat";
import { HUES } from "@/lib/highlight-palette";
import { questionsQuery } from "./article-query";
import type { StoredHighlight } from "./ArticleBody";

/**
 * The Co-Reader — the article's reading companion, docked to the reader's right.
 *
 * Two tabs, both about the page on screen: what it says (a summary, then a
 * scoped conversation with Curio), and what you marked in it (the highlights).
 * The ask composer that used to sit under the article moved here: questions
 * about an article belong beside it, not after 4,000 words of it.
 *
 * Starter questions come from the server, written once per article from its
 * stored summary and cached there — the rail never pays for them twice.
 */

interface Props {
  linkId: number;
  urlKey: string;
  title: string;
  summary: string | null;
  marks: StoredHighlight[];
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  onClose: () => void;
}

export type Tab = "reader" | "notebook";

export function CoReader({
  linkId,
  urlKey,
  title,
  summary,
  marks,
  tab,
  onTabChange,
  onClose,
}: Props) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/insights/chat",
      body: { linkId },
    }),
  });
  const busy = status === "submitted" || status === "streaming";

  const { data: starters = [] } = useQuery(questionsQuery(urlKey));

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const lastParts = (lastAssistant?.parts ?? []) as Part[];
  const phase = busy ? phaseOf(lastParts) : null;

  const ask = (value: string) => {
    const text = value.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <header className="flex shrink-0 items-center gap-1 border-b border-border/60 px-3 py-2">
        {(
          [
            ["reader", "Co-Reader"],
            ["notebook", "Notes"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => onTabChange(id)}
            className={`rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
              tab === id
                ? "bg-foreground/[0.07] text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Co-Reader"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {tab === "reader" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <Conversation className="min-h-0 flex-1">
            <ConversationContent className="gap-6 p-4">
              <section>
                <h2 className="type-label mb-2.5">Summary</h2>
                {summary ? (
                  <p className="text-[14px] leading-[1.6] text-muted-foreground">
                    {summary}
                  </p>
                ) : (
                  <p className="type-caption text-faint-foreground">
                    No summary was written for this article.
                  </p>
                )}
              </section>

              <CurioTranscript
                messages={messages}
                phase={phase}
                error={undefined}
                phaseMark
              />
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="shrink-0 border-t border-border/60 px-4 pb-4 pt-3">
            {messages.length === 0 && starters.length > 0 && (
              <ul className="mb-3 flex flex-col gap-1">
                {starters.map((question) => (
                  <li key={question}>
                    <button
                      type="button"
                      onClick={() => ask(question)}
                      className="group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] leading-[1.5] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                    >
                      <ArrowBendDownRight
                        aria-hidden="true"
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint-foreground"
                      />
                      {question}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                ask(input);
              }}
              className="relative"
            >
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask anything about this article…"
                spellCheck={false}
                aria-label={`Ask about ${title}`}
                className="h-11 w-full rounded-xl border border-border bg-transparent pl-3.5 pr-12 text-base outline-none transition-colors placeholder:text-faint-foreground focus:border-input focus:ring-2 focus:ring-ring/30 sm:text-sm"
              />
              {busy ? (
                <button
                  type="button"
                  onClick={stop}
                  aria-label="Stop"
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-foreground/10 text-foreground"
                >
                  <Square className="h-3 w-3 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Ask"
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </form>
          </div>
        </div>
      ) : (
        <Notebook marks={marks} />
      )}
    </div>
  );
}

/** Everything the owner has marked in this article, in reading order. */
function Notebook({ marks }: { marks: StoredHighlight[] }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <h2 className="type-label mb-3">
        {marks.length} Highlight{marks.length === 1 ? "" : "s"}
      </h2>
      {marks.length === 0 ? (
        <p className="type-caption text-faint-foreground">
          Select a line in the article to mark it. Highlights appear here and to
          everyone who opens this article.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {marks.map((mark) => (
            <li
              key={mark.id}
              className="rounded-lg border border-border/60 p-3"
            >
              <span
                aria-hidden="true"
                className="mb-2 block h-0.5 w-6 rounded-full"
                style={{ backgroundColor: HUES[mark.hue]?.swatch }}
              />
              <p className="type-body text-foreground">{mark.quote}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
