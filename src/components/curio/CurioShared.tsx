"use client";

import { useEffect } from "react";
import type { UIMessage } from "ai";
import posthog from "posthog-js";
import { Check, Link2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import { CopyButton, answerAsMarkdown } from "./CopyButton";
import { Curio } from "./Curio";
import { CurioBadge } from "./CurioBadge";
import { CurioComposer } from "./CurioComposer";
import { useCurioChat } from "./use-curio-chat";
import { useShareConversation } from "./use-share";
import { dateLabel, domainOf, turnsOf, type Source } from "@/lib/curio/turns";

/**
 * A shared conversation.
 *
 * The snapshot is the artifact: it is read from the database, so it keeps
 * working after the collection underneath it has changed, and the link never
 * mutates under whoever holds it.
 *
 * It is also continuable, which is the difference between a dead page and a
 * thread: the tab is seeded with the snapshot, and questions asked from here are
 * added to the reader's own copy in this browser. Nothing is written back to the
 * shared page: a link several people hold cannot be edited by one of them. If a
 * reader wants their version to be a link too, Share makes a new snapshot.
 *
 * The answers render with the reader's markdown stack rather than the chat's:
 * this is a document, and the chat's renderer loads a syntax highlighter at draw
 * time, which a server-rendered page cannot do.
 */
export function CurioShared({
  id,
  title,
  createdAt,
  messages,
}: {
  id: string;
  title: string;
  createdAt: string | Date;
  /** The snapshot, as stored when it was shared. */
  messages: UIMessage[];
}) {
  const chat = useCurioChat({ id, messages });
  const { share, copy, shareState, alreadyShared } = useShareConversation(
    chat.messages
  );

  // The snapshot renders on the server; the live copy takes over once the tab has
  // been seeded. Without this the server would send an empty page and the
  // conversation would only appear after hydration, which reads as a page that
  // lost its own content.
  const seededTurns = turnsOf(messages);
  const liveTurns = turnsOf(chat.messages);
  const turns = liveTurns.length >= seededTurns.length ? liveTurns : seededTurns;
  const question = (title || turns[0]?.question || "").trim();
  const continued = chat.messages.length > messages.length;

  useEffect(() => {
    posthog.capture("curio_shared_opened", { id, turns: turns.length });
    // Once per snapshot opened, not per turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const shareLabel =
    shareState === "working"
      ? "Creating link…"
      : shareState === "copied"
        ? "Link copied"
        : shareState === "failed"
          ? "Try again"
          : alreadyShared
            ? "Copy link"
            : "Share this conversation";

  return (
    // `--tabbar-space` is zeroed here because this route has no tab bar: the
    // badge's own offset is measured from a band that no longer exists.
    <div
      style={{ ["--tabbar-space" as string]: "0px" }}
      className="mx-auto w-full max-w-2xl px-5 pb-[max(env(safe-area-inset-bottom),6rem)] pt-10 sm:px-8 sm:pt-16"
    >
      {/* The header names the thing before the question: the mark, the word,
          and when it was shared. No separator characters doing the work that
          spacing should do. */}
      <header className="flex items-center justify-between gap-4 border-b border-border pb-5">
        <span className="flex items-center gap-2">
          <Curio size={26} />
          <span className="type-label">Curio</span>
        </span>
        {createdAt ? (
          <span className="type-caption text-faint-foreground">
            Shared {dateLabel(createdAt)}
          </span>
        ) : null}
      </header>

      <h1 className="type-display mt-8 max-w-[34rem] text-balance">
        {question || "A question for Curio"}
      </h1>

      {turns.length === 0 ? (
        <p className="type-body mt-8 text-muted-foreground">
          This conversation has nothing in it yet.
        </p>
      ) : (
        <ol className="mt-1">
          {turns.map((turn, index) => (
            <li
              key={`${index}-${turn.question}`}
              className="border-b border-border/60 py-7 last:border-b-0"
            >
              {index > 0 && <h2 className="type-heading">{turn.question}</h2>}

              {turn.answer ? (
                <div className="type-body mt-3 prose prose-green max-w-none prose-headings:font-semibold prose-a:text-green-700 prose-p:text-gray-700 dark:prose-invert dark:prose-a:text-green-500 dark:prose-p:text-muted-foreground prose-blockquote:border-green-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-muted/50">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeHighlight]}
                  >
                    {turn.answer}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="type-caption mt-3 text-faint-foreground">
                  No answer was written for this one.
                </p>
              )}

              {turn.sources.length > 0 && <Sources sources={turn.sources} />}

              {turn.answer && (
                <div className="-ml-2 mt-3">
                  <CopyButton
                    text={answerAsMarkdown(turn.answer, turn.sources)}
                    label="Copy answer"
                    copiedLabel="Copied"
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {chat.error && (
        <p className="mt-6 flex flex-wrap items-center gap-2 type-caption text-red-600">
          Something went wrong.
          <button
            type="button"
            onClick={() => chat.regenerate()}
            className="rounded-md border border-red-600/40 px-2 py-0.5 font-medium transition-colors hover:bg-red-600/10"
          >
            Try again
          </button>
        </p>
      )}

      {/* Continuing: the snapshot stays as it was, the reader's copy grows.
          A compact box and one quiet action, because this is the footnote to a
          document, not the subject of an app screen. */}
      <section className="mt-10">
        <CurioComposer
          compact
          placeholder="Continue this conversation…"
          value={chat.input}
          onChange={chat.setInput}
          onSubmit={chat.submit}
          onStop={chat.stop}
          busy={chat.busy}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="type-caption text-faint-foreground">
            {chat.phase ??
              (continued
                ? "Your questions stay in this browser."
                : "Your questions stay in this browser; this link keeps the thread as it was shared.")}
          </p>
          <button
            type="button"
            onClick={share}
            disabled={shareState === "working"}
            className="inline-flex items-center gap-1.5 type-caption text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            {shareState === "copied" ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {shareLabel}
          </button>
        </div>
      </section>

      <CurioBadge />
    </div>
  );
}

/** The pages an answer came from. Every one was really retrieved. */
function Sources({ sources }: { sources: Source[] }) {
  return (
    <div className="mt-6">
      <p className="type-label">Sources</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-0.5 rounded-lg border border-border/70 px-3 py-2 transition-colors hover:border-border hover:bg-foreground/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
            >
              <span className="truncate type-caption font-medium text-foreground transition-colors group-hover:text-green-700 dark:group-hover:text-green-500">
                {source.title}
              </span>
              <span className="shrink-0 type-caption text-faint-foreground">
                {domainOf(source.url)}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
