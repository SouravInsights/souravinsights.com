"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

/**
 * The Ask panel — the public agent on top of the knowledge base.
 *
 * Citations are rendered from the search tool's OUTPUT, never by scanning the
 * model's prose for URLs. That way a link the model made up has nowhere to
 * appear: if it isn't in `tool-search_knowledge`'s output, it isn't shown.
 */

interface Match {
  url: string;
  title: string;
  channel: string;
  passage: string;
}

const SUGGESTIONS = [
  "cheapest sandboxes for running agents",
  "what have I saved about designing AI agents?",
  "a tool to check colour contrast",
];

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

const shortDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function AskPanel() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/insights/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    sendMessage({ text: value });
    setInput("");
  };

  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="h-4 w-4 text-green-700 dark:text-green-500" />
        <span className="type-body font-medium text-foreground">Ask the collection</span>
        <span className="type-caption text-faint-foreground">
          answers cite saved links only
        </span>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="rounded-full border border-border px-3 py-1 type-caption text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((message) => {
          const text = message.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join("");
          const citations = citationsOf(
            message.parts as { type: string; state?: string; output?: unknown }[]
          );

          if (message.role === "user") {
            return (
              <div key={message.id} className="self-end rounded-xl bg-secondary px-3 py-2">
                <p className="type-body text-foreground">{text}</p>
              </div>
            );
          }

          return (
            <div key={message.id} className="flex flex-col gap-3">
              {text && (
                <p className="type-body whitespace-pre-wrap text-foreground">{text}</p>
              )}
              {citations.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {citations.map((match) => (
                    <li key={match.url}>
                      <a
                        href={match.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col rounded-lg border border-border px-3 py-2 transition-colors hover:border-foreground/20"
                      >
                        <span className="type-body font-medium leading-snug text-foreground group-hover:text-green-700 dark:group-hover:text-green-500">
                          {match.title}
                        </span>
                        <span className="type-caption text-faint-foreground">
                          {shortDomain(match.url)} · {match.channel}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex items-center gap-2 text-faint-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="type-caption">searching the collection…</span>
          </div>
        )}

        {error && (
          <p className="type-caption text-red-600">
            Something went wrong — try again in a moment.
          </p>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(input);
          }}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about anything I've saved…"
            className="type-body flex-1 bg-transparent text-foreground outline-none placeholder:text-faint-foreground"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Ask"
            className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

