"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { Copy, Eraser, LinkSimple, Quotes } from "@phosphor-icons/react";
import { AnchoredPanel } from "@/components/ui/anchored-panel";
import { Button } from "@/components/ui/button";
import { Swatch, SwatchGroup } from "@/components/ui/swatch";
import { HUES } from "@/lib/highlight-palette";
import { useHighlight } from "./highlight-context";

const GAP = 12;
const EDGE = 8;

function HighlightToolbar({ children }: { children?: ReactNode }) {
  const { open, panelRef, close } = useHighlight();

  return (
    <AnchoredPanel
      open={!!open}
      onOpenChange={(next) => {
        if (!next) close(false);
      }}
      anchor={open?.anchor ?? null}
      ref={panelRef}
      sideOffset={GAP}
      collisionPadding={EDGE}
      arrow
      role="toolbar"
      aria-label="Highlight options"
      onPointerDown={(event) => event.preventDefault()}
      onEscapeKeyDown={() => close(true)}
      className="group flex select-none flex-col gap-3 !w-auto !rounded-xl !border-border !bg-background !p-3 !shadow-lg max-sm:gap-2 max-sm:!p-2.5"
    >
      {children ?? (
        <>
          <HighlightActions />
          <div className="flex min-w-0 items-stretch gap-3 max-sm:gap-2">
            <HighlightColors />
            <span aria-hidden="true" className="w-px shrink-0 bg-border" />
            <HighlightList />
          </div>
        </>
      )}
    </AnchoredPanel>
  );
}

function HighlightActions() {
  const { shareable, close, onShareQuote, setSaid, permalinkRange, onCopyLink } = useHighlight();

  return (
    <div className="flex items-center gap-1 border-b border-border pb-2.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          const payload = shareable();
          if (!payload) return;
          close(false);
          onShareQuote(payload);
        }}
        className="h-auto gap-1.5 px-2 py-1 text-[13px] font-normal leading-[1.5] text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
      >
        <Quotes aria-hidden="true" className="size-3.5" />
        Share quote
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          const payload = shareable();
          if (!payload) return;
          void navigator.clipboard.writeText(payload.quote).then(
            () => setSaid("Quote copied"),
            () => setSaid("Could not reach the clipboard"),
          );
        }}
        className="h-auto gap-1.5 px-2 py-1 text-[13px] font-normal leading-[1.5] text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
      >
        <Copy aria-hidden="true" className="size-3.5" />
        Copy
      </Button>
      {onCopyLink && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            void onCopyLink(permalinkRange()).then((ok) =>
              setSaid(ok ? "Link copied" : "Could not copy the link"),
            );
          }}
          className="h-auto gap-1.5 px-2 py-1 text-[13px] font-normal leading-[1.5] text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        >
          <LinkSimple aria-hidden="true" className="size-3.5" />
          Copy link
        </Button>
      )}
    </div>
  );
}

function HighlightColors() {
  const { current, pick, remove } = useHighlight();

  return (
    <div className="grid min-w-0 grid-cols-3 content-start gap-4 max-sm:gap-1.5">
      <SwatchGroup
        aria-label="Highlight colour"
        className="contents"
        value={current ? String(current.hue) : undefined}
        onValueChange={(value) => pick(Number(value))}
      >
        {HUES.map((hue, i) => (
          <Swatch
            key={hue.name}
            value={String(i)}
            background={hue.swatch}
            label={hue.name}
            variant="outline"
            style={{ "--hue": hue.swatch } as React.CSSProperties}
            className="max-sm:size-9 hover:outline-[color-mix(in_srgb,var(--hue)_35%,transparent)] focus-visible:outline-[var(--hue)] data-[state=checked]:outline-[var(--hue)]"
          />
        ))}
      </SwatchGroup>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Remove highlight"
        title="Remove highlight"
        disabled={!current}
        onClick={remove}
        className="size-6 rounded-full p-0 text-muted-foreground max-sm:size-9"
      >
        <Eraser aria-hidden="true" className="size-3.5" />
      </Button>
    </div>
  );
}

function HighlightList() {
  const { ordered, current, selectMark, textOf } = useHighlight();

  return (
    <div className="flex w-32 min-w-0 flex-col gap-0.5 sm:w-40">
      {ordered.length === 0 ? (
        <p className="px-2 py-1 text-[13px] leading-[1.5] text-muted-foreground">
          No highlights yet
        </p>
      ) : (
        <ul className="-mr-1 flex max-h-28 flex-col gap-0.5 overflow-y-auto pr-1">
          {ordered.map((m) => (
            <li key={m.id}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-active={m.id === current?.id ? "" : undefined}
                onClick={() => selectMark(m.id)}
                className={`h-auto w-full justify-start px-2 py-1 text-left text-[13px] font-normal leading-[1.5] ${
                  m.id === current?.id ? "bg-foreground/5 text-foreground" : "text-muted-foreground"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-3 w-0.5 shrink-0 rounded-full"
                  style={{ backgroundColor: HUES[m.hue].swatch }}
                />
                <span className="truncate">{textOf(m.para).slice(m.start, m.end)}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** index of the `occurrence`-th appearance of `quote` in `text`, or -1 */
function nthIndexOf(text: string, quote: string, occurrence: number): number {
  let seen = 0;
  let at = -1;
  while (seen <= occurrence) {
    at = text.indexOf(quote, at + 1);
    if (at === -1) return -1;
    seen++;
  }
  return at;
}

export { HighlightActions, HighlightColors, HighlightList, HighlightToolbar };
