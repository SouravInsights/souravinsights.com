"use client";

import Link from "next/link";
import type { UIMessage } from "ai";
import { MessageResponse } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { CopyButton, answerAsMarkdown } from "./CopyButton";
import { dateLabel, domainOf, turnsOf, type Source } from "@/lib/curio/turns";

/**
 * A shared conversation, as a document.
 *
 * Deliberately not the chat. A chat is a place where something is happening: a
 * box to type in, a stream arriving, a scroll that follows you. A shared answer
 * is a thing to read, and a reader wants the question, the answer, and the
 * pages it came from, in that order and without a moving part.
 *
 * The layout follows the article reader, because it is the same job on the same
 * site: one column, a readable measure, the type scale the rest of the site
 * uses, and a copy button that copies markdown so a quote keeps its sources.
 */
export function CurioShared({
  title,
  createdAt,
  messages,
}: {
  title: string;
  createdAt: string | Date;
  messages: UIMessage[];
}) {
  const turns = turnsOf(messages);
  const question = (title || turns[0]?.question || "").trim();

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-[max(env(safe-area-inset-bottom),2.5rem)] pt-10 sm:px-8 sm:pt-16">
      <header className="border-b border-border pb-6">
        <p className="type-label">
          Curio{createdAt ? ` · shared ${dateLabel(createdAt)}` : ""}
        </p>
        <h1 className="type-title mt-3">
          {question || "A question for Curio"}
        </h1>
      </header>

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
              {/* The first question is the page's heading; later ones sit above
                  their own answer, so a reader always knows what is being
                  answered without scrolling back. */}
              {index > 0 && <h2 className="type-heading">{turn.question}</h2>}

              {turn.answer ? (
                <div className="type-body mt-3 prose prose-green max-w-none prose-headings:font-semibold prose-a:text-green-700 prose-p:text-gray-700 dark:prose-invert dark:prose-a:text-green-500 dark:prose-p:text-muted-foreground prose-blockquote:border-green-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-muted/50">
                  <MessageResponse>{turn.answer}</MessageResponse>
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

      <footer className="mt-12 rounded-xl border border-border bg-card p-5">
        <p className="type-heading">Ask your own question</p>
        <p className="type-caption mt-1">
          Curio answers from a curated collection of saved links, and cites the
          pages it used and nothing else.
        </p>
        <Button asChild className="mt-4">
          <Link href="/curio">Open Curio</Link>
        </Button>
      </footer>
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
