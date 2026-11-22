"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { QuoteStudio } from "./studio";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: string;
  title: string;
  publication: string;
  /** surrounding article text, for the faded-backdrop design */
  context: string;
}

/**
 * Share quote, as a modal.
 *
 * The studio itself lives in `studio.tsx` and is rendered here unchanged; this
 * file only supplies the dialog chrome and the open/close animation. The same
 * studio is rendered inline on the landing page.
 */
export function ShareQuoteDialog({
  open,
  onOpenChange,
  quote,
  title,
  publication,
  context,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <style>{`
        @keyframes qs-palette-in { from { opacity: 0; scale: .97 } }
        @keyframes qs-palette-out { to { opacity: 0; scale: .98 } }
      `}</style>

      <DialogContent className="flex w-auto !max-w-[96vw] flex-col gap-0 overflow-hidden rounded-[14px] border border-border bg-card p-0 text-foreground shadow-2xl data-[state=open]:!animate-[qs-palette-in_200ms_cubic-bezier(0.32,0.72,0,1)_backwards] data-[state=closed]:!animate-[qs-palette-out_150ms_ease-in_forwards] [&>button]:z-30 [&>button]:right-3 [&>button]:top-3.5 [&>button]:text-muted-foreground [&>button]:hover:text-foreground">
        <DialogTitle className="sr-only">Share quote</DialogTitle>
        <QuoteStudio
          quote={quote}
          title={title}
          publication={publication}
          context={context}
          active={open}
        />
      </DialogContent>
    </Dialog>
  );
}
