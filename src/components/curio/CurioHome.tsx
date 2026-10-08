"use client";

import { useEffect, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { CurioComposer } from "./CurioComposer";
import { CurioIntro, CurioTranscript } from "./CurioConversation";
import { SuggestionRows } from "./SuggestionRows";
import { shuffled, useCurioChat } from "./use-curio-chat";

/**
 * Curio's own page: one column, the whole viewport, and the composer going where
 * the work is.
 *
 * Empty, the composer sits centred under the mark, because a box pinned to the
 * bottom of an empty screen looks stranded — Perplexity and Claude both put it
 * under the greeting, and both move it down the moment there is something to
 * read. From then on the transcript gets every remaining pixel.
 *
 * The panel on /insights is the opposite trade: a card inside a page about
 * something else, so it stays small and that page keeps its own scroll.
 */
export function CurioHome({ suggestions }: { suggestions: string[] }) {
  const { messages, busy, error, phase, input, setInput, submit } = useCurioChat();
  const [chips, setChips] = useState(suggestions);

  // Shuffle once per visit so the same chips aren't always first, and on mount
  // rather than during render so server and client agree on the first paint.
  useEffect(() => setChips(shuffled(suggestions)), [suggestions]);

  const started = messages.length > 0;

  return (
    /* An app screen: the shell's frame is a rail on the left, and a tab bar at
       the bottom on a phone — so the column takes everything left and lands
       exactly on the viewport, and the page itself never scrolls. One number,
       owned by globals.css. `svh`, not `vh` or `dvh`: the height must not
       change when a phone's toolbars slide. */
    <div className="flex h-[calc(100svh-var(--tabbar-space))] flex-col">
      {/* No title bar. The navbar already names where you are — a second row
          saying "Curio" under a pill that says "Curio" is chrome paying for
          itself twice, and the space it ate is the reason this page exists. The
          document keeps a heading for assistive tech and crawlers. */}
      <h1 className="sr-only">Curio</h1>

      <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col px-4">
        {started ? (
          <>
            <Conversation>
              <ConversationContent className="gap-6 p-0 py-4">
                <CurioTranscript
                  messages={messages}
                  phase={phase}
                  error={error}
                  phaseMark
                />
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            {/* Docked, and clear of the home indicator on a phone. */}
            <div className="shrink-0 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
              <CurioComposer
                value={input}
                onChange={setInput}
                onSubmit={submit}
                busy={busy}
              />
            </div>
          </>
        ) : (
          /* Scrollable only if the screen is genuinely too short for the three
             pieces stacked — never at the sizes this is used at. */
          <div className="flex flex-1 flex-col justify-center gap-6 overflow-y-auto py-6">
            <CurioIntro size={104} />
            <CurioComposer
              value={input}
              onChange={setInput}
              onSubmit={submit}
              busy={busy}
            />
            <SuggestionRows suggestions={chips} onPick={submit} disabled={busy} />
          </div>
        )}
      </div>
    </div>
  );
}
