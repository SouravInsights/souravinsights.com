"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SidePanel } from "@/components/ui/side-panel";

export function SidePanelDemo() {
  const [open, setOpen] = useState(true);

  return (
    <div className="relative flex h-64 w-full max-w-xl overflow-hidden rounded-xl border bg-background">
      <SidePanel open={open} side="left" width={200} className="p-4">
        <p className="text-sm text-muted-foreground">Panel content</p>
      </SidePanel>
      <div className="flex flex-1 items-center justify-center">
        <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)}>
          {open ? "Hide" : "Show"} panel
        </Button>
      </div>
    </div>
  );
}
