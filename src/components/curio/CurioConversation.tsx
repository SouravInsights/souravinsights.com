"use client";

import type { UIMessage } from "ai";
import { Loader2 } from "lucide-react";
import posthog from "posthog-js";
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
  phaseMark = false,
}: {
  messages: UIMessage[];
  phase: string | null;
  error: Error | undefined;
  /** Show Curio in the waiting row instead of a spinner. */
  phaseMark?: boolean;
}) {
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
                  {citations.length > 0 && (
                    <Sources defaultOpen>
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
        <p className="type-caption text-red-600">
          Something went wrong — try again in a moment.
        </p>
      )}
    </>
  );
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
