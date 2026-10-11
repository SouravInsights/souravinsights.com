"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { Search } from "lucide-react";
import {
  citationsOf,
  phaseOf,
  type Part,
} from "@/components/curio/use-curio-chat";

/**
 * The reader's scoped ask (docs/spec/insights-rebuild.md): questions about the
 * article on screen, answered from its passages alone. Same agent plumbing as
 * Ask/Curio — the transport just pins this article's linkId into every call.
 */

interface Props {
  linkId: number;
  title: string;
}

function textOf(parts: Part[]): string {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("");
}

export function ReaderAsk({ linkId, title }: Props) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/insights/chat",
      body: { linkId },
    }),
  });
  const busy = status === "submitted" || status === "streaming";

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const lastParts = (lastAssistant?.parts ?? []) as Part[];
  const phase = busy ? phaseOf(lastParts) : null;

  const ask = () => {
    const value = input.trim();
    if (!value || busy) return;
    sendMessage({ text: value });
    setInput("");
  };

  return (
    <section className="mt-16 border-t border-border pt-8">
      <h2 className="type-caption font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Ask about this article
      </h2>

      {messages.length > 0 && (
        <div className="mt-4 flex flex-col gap-5">
          {messages.map((message) => {
            if (message.role === "user") {
              return (
                <p key={message.id} className="type-body font-medium text-foreground">
                  {textOf(message.parts as Part[])}
                </p>
              );
            }
            const parts = message.parts as Part[];
            const text = textOf(parts);
            const citations = citationsOf(parts);
            return (
              <div key={message.id} className="type-body text-muted-foreground">
                {text && <p className="whitespace-pre-wrap">{text}</p>}
                {citations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {citations.map((citation) => (
                      <a
                        key={citation.url}
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 type-caption text-green-700 transition-colors hover:bg-foreground/5 dark:text-green-500"
                      >
                        {citation.title || citation.url}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {busy && phase && (
            <p className="type-caption text-faint-foreground">{phase}</p>
          )}
        </div>
      )}

      <div className="relative mt-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") ask();
          }}
          placeholder={`Ask about “${title}”…`}
          spellCheck={false}
          aria-label={`Ask about ${title}`}
          className="h-11 w-full rounded-xl border border-border bg-transparent pl-9 pr-3 text-base outline-none transition-colors placeholder:text-faint-foreground focus:border-input focus:ring-2 focus:ring-ring/30 sm:text-sm"
        />
      </div>
    </section>
  );
}
