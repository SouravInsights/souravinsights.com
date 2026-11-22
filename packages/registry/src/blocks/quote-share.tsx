"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShareQuoteDialog } from "@/components/quote/dialog";

export interface QuoteShareProps {
  quote: string;
  context?: string;
  title: string;
  publication: string;
}

/** A single share button over the quote studio. */
export function QuoteShare({
  quote,
  context = "",
  title,
  publication,
}: QuoteShareProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Share quote
      </Button>
      <ShareQuoteDialog
        open={open}
        onOpenChange={setOpen}
        quote={quote}
        context={context}
        title={title}
        publication={publication}
      />
    </>
  );
}
