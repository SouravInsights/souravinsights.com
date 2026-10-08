"use client";

/**
 * The agent's plumbing, in one place. Both surfaces — the Ask panel on
 * /insights and the full page at /curio — read from here.
 *
 * Why a hook and not two copies: the rule that citations come from the search
 * tool's *output* rather than the model's prose is the thing that makes a
 * made-up URL impossible to render. A second copy of that is a second chance to
 * get it wrong, so the transcript component and this hook are shared, and only
 * the chrome around them differs.
 */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import posthog from "posthog-js";
import { useState } from "react";

export interface Match {
  url: string;
  title: string;
  channel: string;
  passage: string;
}

export type Part = {
  type: string;
  state?: string;
  text?: string;
  input?: { query?: string; url?: string };
  output?: unknown;
};

/** Fisher-Yates. Unseeded on purpose — we want a different order per visit. */
export function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The domain of a URL, for showing which page is being read. */
function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * What the agent is doing *right now*.
 *
 * Without this the transcript is blank for ~10 seconds, because the answer only
 * starts streaming after the model has decided to search, the tool has run, and
 * the model has produced its first token. The tool part's `state` maps exactly
 * onto those waits:
 *   input-streaming → the model is still emitting the call  ("Thinking…")
 *   input-available  → we're running the tool                ("Searching…", "Reading…")
 *   output-available → the model is composing the answer     ("Writing…")
 * We read the *last* tool part, so a search followed by a `fetch_link` reports
 * the fetch. Returns null once answer text starts arriving.
 */
export function phaseOf(parts: Part[]): string | null {
  if (parts.some((part) => part.type === "text" && part.text)) return null;

  const tool = [...parts].reverse().find((part) => part.type.startsWith("tool-"));
  if (!tool || tool.state === "input-streaming") return "Thinking…";
  if (tool.state === "output-available") return "Writing…";

  if (tool.type === "tool-fetch_link") {
    const host = tool.input?.url ? hostOf(tool.input.url) : null;
    return host ? `Reading ${host}…` : "Reading that page…";
  }

  const query = tool.input?.query;
  return query ? `Searching for “${query}”…` : "Searching the collection…";
}

/**
 * Every link the tools returned in this message. `fetch_link` counts too: a page
 * read fresh is what a comparison is actually based on, so hiding it would leave
 * the recommendation citing nothing.
 */
export function citationsOf(parts: { type: string; state?: string; output?: unknown }[]) {
  const seen = new Set<string>();
  const out: Match[] = [];

  for (const part of parts) {
    if (part.state !== "output-available") continue;

    if (part.type === "tool-search_knowledge") {
      const matches = (part.output as { matches?: Match[] } | undefined)?.matches ?? [];
      for (const match of matches) {
        if (seen.has(match.url)) continue;
        seen.add(match.url);
        out.push(match);
      }
      continue;
    }

    if (part.type === "tool-fetch_link") {
      const page = part.output as
        | { url?: string; title?: string; text?: string; error?: string }
        | undefined;
      if (!page?.url || page.error || seen.has(page.url)) continue;
      seen.add(page.url);
      out.push({
        url: page.url,
        title: page.title || page.url,
        channel: "web",
        passage: (page.text ?? "").slice(0, 240),
      });
    }
  }

  return out;
}

export function useCurioChat() {
  const [input, setInput] = useState("");

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

    // The signal that matters later: do the answers get used, and do people come
    // back? Cheap to record now, impossible to reconstruct afterwards.
    posthog.capture("insights_asked", {
      question: value,
      length: value.length,
    });

    sendMessage({ text: value });
    setInput("");
  };

  return { messages, busy, error, phase, input, setInput, submit };
}
