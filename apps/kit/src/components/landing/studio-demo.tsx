"use client";

import { useState } from "react";
import { ShareQuoteDialog } from "@/components/quote/dialog";

/** The real studio, opened from the page. */
export function StudioDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="studio" onClick={() => setOpen(true)}>
        Open the studio
      </button>
      <ShareQuoteDialog
        open={open}
        onOpenChange={setOpen}
        quote="A quote is the only ad that reads like a compliment."
        context=""
        title="Disappearing interfaces"
        publication="souravinsights.com"
      />
    </>
  );
}
