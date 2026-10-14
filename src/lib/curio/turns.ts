import type { UIMessage } from "ai";

/**
 * A conversation as turns — the shape both a shared page and a copyable
 * transcript need, and the same rule the chat itself follows: a source comes
 * from a tool's OUTPUT, never from the model's prose, so an invented link has
 * nowhere to appear.
 */

export interface Source {
  title: string;
  url: string;
}

export interface Turn {
  question: string;
  answer: string;
  sources: Source[];
}

interface ToolMatch {
  url: string;
  title?: string;
}

const textOf = (message: UIMessage): string =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { text: string }).text)
    .join("");

/** Every distinct link the tools returned for this message, in order. */
export function sourcesOf(message: UIMessage): Source[] {
  const seen = new Set<string>();
  const sources: Source[] = [];

  const add = (url: string, title?: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    sources.push({ url, title: title || url });
  };

  for (const part of message.parts) {
    const tool = part as { type: string; state?: string; output?: unknown };
    if (tool.state !== "output-available") continue;

    if (tool.type === "tool-search_knowledge") {
      const matches = (tool.output as { matches?: ToolMatch[] } | undefined)?.matches ?? [];
      for (const match of matches) add(match.url, match.title);
      continue;
    }

    if (tool.type === "tool-fetch_link") {
      const page = tool.output as { url?: string; title?: string; error?: string } | undefined;
      if (page?.error) continue;
      if (page?.url) add(page.url, page.title);
    }
  }

  return sources;
}

/**
 * Questions and answers in order. A question with no answer yet (a session
 * shared mid-stream) still makes a turn, so nothing the reader typed is lost.
 */
export function turnsOf(messages: UIMessage[]): Turn[] {
  const turns: Turn[] = [];
  let pending: string | null = null;

  for (const message of messages) {
    if (message.role === "user") {
      pending = textOf(message).trim();
      continue;
    }
    const answer = textOf(message).trim();
    const sources = sourcesOf(message);
    if (!pending && !answer) continue;
    turns.push({ question: pending ?? "", answer, sources });
    pending = null;
  }

  if (pending) turns.push({ question: pending, answer: "", sources: [] });
  return turns;
}

/** "12 October 2026" — a date a reader can read, not a timestamp. */
export function dateLabel(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** The host, for the quiet second line of a source. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
