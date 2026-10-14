import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CurioShared } from "@/components/curio/CurioShared";
import {
  getConversation,
  withVerifiedSources,
} from "@/lib/curio/conversations";
import { turnsOf } from "@/lib/curio/turns";

/**
 * A shared conversation.
 *
 * The snapshot is the artifact: sharing stored the answers and the links they
 * used, so this page keeps working long after the collection underneath it has
 * changed. Nothing here is editable, and nothing needs a key.
 *
 * `noindex` on purpose. A shared link is unlisted, not published: it should open
 * for whoever holds it and stay out of search results, which is the difference
 * between sharing a conversation and posting it.
 */

export const revalidate = 300;

const excerpt = (text: string, length = 155): string => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length - 1)}…` : clean;
};

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const conversation = await getConversation(params.id);
  if (!conversation) return { title: "Conversation not found | Curio" };

  const turns = turnsOf(conversation.messages);
  const question = conversation.title || turns[0]?.question || "A question for Curio";
  const description =
    excerpt(turns.find((turn) => turn.answer)?.answer ?? "") ||
    "A conversation with Curio, answered from a curated collection of saved links.";

  return {
    title: `${question} | Curio`,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      title: question,
      description,
      type: "article",
      url: `https://www.souravinsights.com/curio/${conversation.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: question,
      description,
    },
  };
}

export default async function SharedConversationPage({
  params,
}: {
  params: { id: string };
}) {
  const conversation = await getConversation(params.id);
  if (!conversation) notFound();

  return (
    <CurioShared
      id={conversation.id}
      title={conversation.title}
      createdAt={conversation.createdAt}
      messages={await withVerifiedSources(conversation.messages)}
    />
  );
}
