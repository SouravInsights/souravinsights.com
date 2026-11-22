"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AnchoredPanel } from "@/components/ui/anchored-panel";

export function AnchoredPanelDemo() {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(true);

  return (
    <div>
      <Button ref={trigger} variant="outline" onClick={() => setOpen((value) => !value)}>
        {open ? "Hide" : "Show"} panel
      </Button>
      <AnchoredPanel
        open={open}
        onOpenChange={setOpen}
        arrow
        anchor={() => trigger.current?.getBoundingClientRect() ?? null}
      >
        <p className="text-sm text-muted-foreground">Anchored to the button.</p>
      </AnchoredPanel>
    </div>
  );
}
