import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { UIMessage } from "ai";
import { db } from "@/db";
import { conversations } from "@/db/schema";

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
