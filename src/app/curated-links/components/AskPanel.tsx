"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
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
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

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
 * Chips written the way a visitor would actually type — intent, not titles —
 * and each one is answerable from a link that is really in the collection.
 */
const SUGGESTIONS = [
  "cheapest sandboxes for running agents",
  "a tool to check colour contrast",
  "what have I saved about designing AI agents?",
  "how to find problems worth solving as a staff engineer",
  "why shipping beats polishing",
  "how to make interfaces feel predictable",
  "practical typography rules for the web",
  "learn AI engineering from scratch",
  "learn cloud computing from zero",
  "self-hosted durable objects",
  "a data warehouse built on duckdb",
  "postgres tooling for AI agents",
  "an open database of AI models",
  "voice to text on macOS",
  "screenshots of live websites",
  "an orchestration engine for background jobs",
  "local https domains for development",
  "image compression tools",
  "how to organise design files",
  "AI design generators",
  "how to deploy models in production",
  "design engineering resources",
  "hand-picked design links",
  "react best practices",
  "task runners for common coding tasks",
  "how to prevent cognitive debt from AI code",
  "design skills for AI harnesses",
  "small sharp unix tools",
  "how to turn an app into a context graph",
  "how to get more replies by writing less",
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
    <section className="overflow-hidden rounded-lg border border-border bg-background">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-4 py-3">
        <Sparkles className="h-4 w-4 text-green-700 dark:text-green-500" />
        <h2 className="type-body font-medium text-foreground">Ask the collection</h2>
        <span className="type-caption text-faint-foreground">
          answers come only from saved links
        </span>
      </header>

      <Conversation className="h-96">
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
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border px-4 pt-3">
        <Suggestions className="pb-1">
          {SUGGESTIONS.map((suggestion) => (
            <Suggestion
              key={suggestion}
              suggestion={suggestion}
              onClick={submit}
              disabled={busy}
              className="type-caption"
            />
          ))}
        </Suggestions>
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
          className="type-body flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-foreground outline-none placeholder:text-faint-foreground focus-visible:border-foreground/30"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Ask"
          className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}

