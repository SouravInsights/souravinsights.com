"use client";

import Link from "next/link";
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
 * The quiet link, borrowed from the "Open full page" link in the insights panel:
 * the paragraph's own colour, green only on hover, ring on focus. No colour of
 * its own, on purpose — the footnote's weight is then one knob, the colour of
 * the sentence, instead of two drifting apart. The underline is the one
 * addition: a link inline in quiet prose needs an affordance to be seen at all,
 * where that one anchors a header row and does not.
 */
const noteLinkClass =
  "rounded-sm underline decoration-border underline-offset-4 transition-colors hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700/40 dark:hover:text-green-500";

/**
 * Curio's own page: one column, the whole viewport, and the composer going where
 * the work is.
 *
 * Empty, the composer sits centred and closes the stack, with the chips and the
 * note above it: a box pinned to the bottom of an empty screen looks stranded,
 * and ending on the box keeps the action last, where a footnote would otherwise
 * be. It also shortens the jump when the composer docks for the first answer.
 * From then on the transcript gets every remaining pixel.
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
          /* Scrollable only if the screen is genuinely too short for the pieces
             stacked — never at the sizes this is used at. */
          /* `px-1` is load-bearing, not decoration: `overflow-y-auto` makes the
             computed `overflow-x` auto as well, so this div clips at its padding
             box. Without horizontal padding a full-width composer's edges sit on
             that clip edge and its focus ring — drawn 2px outside the box — is
             cut off on both sides. Full-width children lose 4px, which nothing
             here notices. */
          <div className="flex flex-1 flex-col justify-center gap-8 overflow-y-auto px-1 py-6">
            <CurioIntro size={104} />

            {/* The ways in, as one block: the chips and the note are the same kind
                of thing — an option — so they sit tight, and the box below gets the
                room. Equal gaps everywhere would flatten that. */}
            <div className="flex flex-col gap-3">
              <SuggestionRows suggestions={chips} onPick={submit} disabled={busy} />

              {/* An option, not a disclaimer: options sit with the other ways in
                  — the chips above — where a disclaimer would sit under the form.
                  The empty state is also the only place it can go, because the
                  footer that carries this line on other routes is dropped here on
                  purpose (an app screen with a footer is a website in costume).

                  A step below the chips, which are `type-caption` at 13px: this is
                  `text-xs` in the muted tier, with links that take the sentence's
                  colour and go green only on hover. Plain copy, because
                  "queryable" is a database word, and "Curio runs in your tools"
                  would be a lie: MCP exposes the retrieval, not this page. */}
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                Use it from your own agent too: point{" "}
                <Link href="/docs#mcp" className={noteLinkClass}>
                  an MCP client
                </Link>{" "}
                at the collection, or call the{" "}
                <Link href="/api/docs" className={noteLinkClass}>
                  API
                </Link>
                .
              </p>
            </div>

            {/* More air above the box than between the blocks above it: it is the
                action, and the space is what says so. */}
            <div className="mt-4">
              <CurioComposer
                value={input}
                onChange={setInput}
                onSubmit={submit}
                busy={busy}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
