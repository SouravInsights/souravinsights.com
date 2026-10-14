"use client";

import type { UIMessage } from "ai";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { CopyButton, answerAsMarkdown } from "./CopyButton";
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
import { Curio } from "./Curio";
import { citationsOf } from "./use-curio-chat";

/**
 * The transcript. Shared by the Ask panel and the full page, because the rule
 * inside it is the one that keeps the agent honest: citations are read from the
 * search tool's OUTPUT, never from the model's prose, so a made-up URL has
 * nowhere to appear. A second copy of this would be a second chance to get it
 * wrong.
 */
export function CurioTranscript({
  messages,
  phase,
  error,
  onRetry,
  phaseMark = false,
}: {
  messages: UIMessage[];
  phase: string | null;
  error: Error | undefined;
  /** Ask once more. A failed answer is a retry, not a dead end. */
  onRetry?: () => void;
  /** Show Curio in the waiting row instead of a spinner. */
  phaseMark?: boolean;
}) {
  /**
   * Follow the answer as it arrives.
   *
   * StickToBottom already follows content that grows, but a streaming answer
   * also changes the row *around* it: the waiting row disappears, sources
   * appear, the block grows a line at a time. Asking explicitly, only while the
   * reader is already at the bottom, keeps the tail of the answer on screen
   * without ever fighting someone who scrolled up to read.
   */
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  const newestAnswer = messages.filter((m) => m.role === "assistant").at(-1);
  const answerLength = newestAnswer
    ? newestAnswer.parts
        .filter((part) => part.type === "text")
        .map((part) => (part as { text: string }).text)
        .join("").length
    : 0;

  useEffect(() => {
    if (!isAtBottom) return;
    scrollToBottom();
  }, [answerLength, phase, isAtBottom, scrollToBottom]);

  return (
    <>
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
                  {/* Only once there is an answer to read. Rendering this while
                      the answer is still empty put a sources panel on screen
                      before the thing it was sourcing. */}
                  {text && citations.length > 0 && (
                    <Sources>
                      <SourcesTrigger count={citations.length} />
                      <SourcesContent>
                        {citations.map((citation, index) => (
                          <Source
                            key={citation.url}
                            href={citation.url}
                            title={citation.title}
                            onClick={() =>
                              posthog.capture("insights_citation_clicked", {
                                url: citation.url,
                                channel: citation.channel,
                                position: index + 1,
                                total: citations.length,
                              })
                            }
                          />
                        ))}
                      </SourcesContent>
                    </Sources>
                  )}
                  {text && (
                    <div className="-ml-2 mt-1">
                      <CopyButton
                        label="Copy"
                        text={answerAsMarkdown(
                          text,
                          citations.map((citation) => ({
                            title: citation.title,
                            url: citation.url,
                          }))
                        )}
                      />
                    </div>
                  )}
                </>
              ) : (
                text
              )}
            </MessageContent>
          </Message>
        );
      })}

      {phase && (
        <div className="flex items-center gap-2 text-faint-foreground">
          {phaseMark ? (
            /* The page has no header mark, so the wait is Curio's one chance to
               look like it is working. The panel keeps the spinner: its header
               mark is already breathing three lines up, and the same action
               twice on one screen reads as a glitch. */
            <Curio size={20} busy />
          ) : (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          <span className="type-caption">{phase}</span>
        </div>
      )}

      {error && (
        <p className="flex flex-wrap items-center gap-2 type-caption text-red-600">
          Something went wrong.
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md border border-red-600/40 px-2 py-0.5 font-medium transition-colors hover:bg-red-600/10"
            >
              Try again
            </button>
          )}
        </p>
      )}
    </>
  );
}

/** The whole conversation as markdown, for pasting into a note or a chat. */
export function transcriptAsMarkdown(messages: UIMessage[]): string {
  return messages
    .map((message) => {
      const text = message.parts
        .filter((part) => part.type === "text")
        .map((part) => (part as { text: string }).text)
        .join("");
      const citations = citationsOf(
        message.parts as { type: string; output?: unknown }[]
      );
      const heading = message.role === "user" ? "**You**" : "**Curio**";
      const sources = citations.length
        ? `\n\nSources:\n${citations
            .map((citation) => `- [${citation.title || citation.url}](${citation.url})`)
            .join("\n")}`
        : "";
      return `${heading}\n\n${text}${sources}`;
    })
    .join("\n\n---\n\n");
}

/**
 * The empty state: the mark introduces itself, and leaves once there is
 * anything to read. Not a permanent fixture — a mark parked beside a live
 * conversation reads as a form field rather than an identity.
 *
 * `size` is the only difference between the panel's version and the page's: the
 * page has the room, so the mark there is roughly twice the panel's.
 */
export function CurioIntro({ size = 64 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-3 py-3 text-center">
      <Curio size={size} />
      <div className="flex flex-col gap-1">
        <p className="type-heading">Meet Curio</p>
        <p className="type-caption text-faint-foreground">
          Ask anything from the collection, or tap a suggestion below.
        </p>
      </div>
    </div>
  );
}
