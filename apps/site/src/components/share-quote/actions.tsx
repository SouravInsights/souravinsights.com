"use client";

import {
  Check,
  Copy as CopyIcon,
  DownloadSimple,
  SlidersHorizontal,
  SpinnerGap,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Toggle } from "@/components/ui/toggle";

export interface QuoteActionsProps {
  customize: boolean;
  onCustomizeChange: (open: boolean) => void;
  status: "idle" | "working" | "done" | "error";
  statusText: string;
  onSave: () => void;
  onCopy: () => void;
}

/** The dialog footer: customize, save and copy. */
function QuoteActions({
  customize,
  onCustomizeChange,
  status,
  statusText,
  onSave,
  onCopy,
}: QuoteActionsProps) {
  return (
    <div className="flex h-[52px] items-center gap-2 rounded-b-[14px] border-t border-border bg-card px-3">
      <Toggle
        type="button"
        aria-label="Customize"
        pressed={customize}
        onPressedChange={onCustomizeChange}
        className="h-8 gap-1.5 rounded-md px-3 text-[13.5px] font-medium text-muted-foreground transition-colors hover:!bg-foreground/[0.08] hover:text-foreground active:scale-[0.97] data-[state=on]:!bg-foreground/[0.08] data-[state=on]:text-foreground"
      >
        <SlidersHorizontal className="size-3.5" />
        <span className="hidden sm:inline">Customize</span>
      </Toggle>

      <div className="flex-1" />

      {status !== "idle" && (
        <span
          aria-live="polite"
          className={`mr-1 text-[12px] ${
            status === "error" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {statusText}
        </span>
      )}

      <Button
        type="button"
        variant="secondary"
        onClick={onSave}
        disabled={status === "working"}
        className="h-8 min-w-[108px] gap-1.5 rounded-md !bg-foreground/[0.06] px-3 text-[13.5px] font-medium text-foreground hover:!bg-foreground/[0.08]"
      >
        {status === "working" ? (
          <SpinnerGap className="size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <DownloadSimple className="size-3.5 text-muted-foreground" />
        )}
        Save image
        <Kbd className="ml-0.5 hidden bg-transparent p-0 font-sans text-[11px] font-medium text-current opacity-55 sm:inline-flex">
          ⌘S
        </Kbd>
      </Button>

      <Button
        type="button"
        onClick={onCopy}
        disabled={status === "working"}
        className="h-8 min-w-[112px] gap-1.5 rounded-md bg-foreground px-3 text-[13.5px] font-semibold text-background hover:bg-foreground/90 active:scale-[0.97]"
      >
        {status === "done" ? (
          <Check className="size-3.5 opacity-70" />
        ) : (
          <CopyIcon className="size-3.5 opacity-70" />
        )}
        Copy image
        <Kbd className="ml-0.5 hidden bg-transparent p-0 font-sans text-[11px] font-medium text-current opacity-55 sm:inline-flex">
          ⌘C
        </Kbd>
      </Button>
    </div>
  );
}

export { QuoteActions };
