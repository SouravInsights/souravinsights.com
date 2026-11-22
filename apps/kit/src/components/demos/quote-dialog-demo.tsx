"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShareQuoteDialog } from "@/components/quote/dialog";

const QUOTE =
  "The best interfaces disappear. You stop noticing the buttons and the panels and the type, and you are left with the thing you came to do.";

export function QuoteDialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Share quote
      </Button>
      <ShareQuoteDialog
        open={open}
        onOpenChange={setOpen}
        quote={QUOTE}
        context=""
        title="Disappearing interfaces"
        publication="souravinsights.com"
      />
    </div>
  );
}
