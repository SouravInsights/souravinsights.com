import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import type { UIMessage } from "ai";
import { db } from "@/db";
import { conversations, links } from "@/db/schema";
import { normalizeUrl } from "@/app/insights/utils/urlUtils";

/**
 * Shared conversations.
 *
 * A chat session is worth keeping: the answer someone got is the answer they
 * want to send to somebody else, sources included. Storing it whole means the
 * link keeps working after the collection underneath it has changed, which is
 * the point of a link.
 *
 * Ids are random, so a session is only reachable by whoever holds it. There is
 * no listing, no search, and nothing here is indexed for retrieval.
 */

export interface SharedConversation {
  id: string;
  title: string;
  createdAt: Date;
  messages: UIMessage[];
}

/** The first question, trimmed, as a title for the link. */
const titleOf = (messages: UIMessage[]): string => {
  const first = messages.find((message) => message.role === "user");
  const text = (first?.parts ?? [])
    .map((part) => ("text" in part ? String(part.text) : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 90 ? `${text.slice(0, 89)}…` : text;
};

export async function saveConversation(
  messages: UIMessage[]
): Promise<SharedConversation> {
  const id = randomUUID().replace(/-/g, "").slice(0, 12);
  const [row] = await db
    .insert(conversations)
    .values({ id, title: titleOf(messages), messages })
    .returning();
  return row as SharedConversation;
}

export async function getConversation(
  id: string
): Promise<SharedConversation | null> {
  if (!/^[a-z0-9]{6,32}$/.test(id)) return null;
  const [row] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);
  return (row as SharedConversation) ?? null;
}

/**
 * Only sources that are really in the collection.
 *
 * Anyone can share, and a shared page prints its sources as links on this
 * domain. A hand-made POST could therefore put any address there, dressed as
 * something the collection cites. Every source is checked against the links
 * table and anything unknown is dropped, so a shared conversation can only
 * point at pages this collection actually holds.
 */
export async function withVerifiedSources(
  messages: UIMessage[]
): Promise<UIMessage[]> {
  const urls = new Set<string>();

  for (const message of messages) {
    for (const part of message.parts) {
      const tool = part as { type: string; output?: unknown };
      if (!tool.type.startsWith("tool-") || !tool.output) continue;
      const output = tool.output as
        | { matches?: { url?: string }[]; url?: string }
        | undefined;
      for (const match of output?.matches ?? []) {
        if (match?.url) urls.add(match.url);
      }
      if (output?.url) urls.add(output.url);
    }
  }

  if (urls.size === 0) return messages;

  const known = new Set(
    (
      await db
        .select({ urlKey: links.urlKey })
        .from(links)
        .where(
          inArray(
            links.urlKey,
            Array.from(urls).map((url) => normalizeUrl(url))
          )
        )
    ).map((row) => row.urlKey)
  );

  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      const tool = part as { type: string; output?: unknown };
      if (!tool.type.startsWith("tool-") || !tool.output) return part;

      const output = tool.output as {
        matches?: { url?: string; title?: string }[];
        url?: string;
        title?: string;
      };

      if (Array.isArray(output.matches)) {
        return {
          ...part,
          output: {
            ...output,
            matches: output.matches.filter(
              (match) => match.url && known.has(normalizeUrl(match.url))
            ),
          },
        } as UIMessage["parts"][number];
      }

      if (output.url && !known.has(normalizeUrl(output.url))) {
        return {
          ...part,
          output: { ...output, url: undefined, title: undefined, text: "" },
        } as UIMessage["parts"][number];
      }

      return part;
    }),
  }));
}
