"use client";

import {
  Check,
  Copy as CopyIcon,
  DownloadSimple,
  SlidersHorizontal,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Toggle } from "@/components/ui/toggle";

type Status = "idle" | "working" | "done" | "error";

export interface QuoteActionsProps {
  customize: boolean;
  onCustomizeChange: (open: boolean) => void;
  /** which control the status belongs to */
  action: "save" | "copy" | null;
  status: Status;
  statusText: string;
  onSave: () => void;
  onCopy: () => void;
}

/**
 * A label that reserves the width of every state, so the button never resizes
 * as it moves from "Save image" to "Saving…" to "Saved".
 */
function ActionLabel({
  status,
  idle,
  working,
  done,
  kbd,
}: {
  status: Status;
  idle: string;
  working: string;
  done: string;
  kbd: string;
}) {
  return (
    <span className="grid text-left">
      <span
        className={`col-start-1 row-start-1 inline-flex items-center gap-1 ${
          status === "idle" ? "" : "invisible"
        }`}
      >
        {idle}
        <Kbd className="ml-0.5 hidden bg-transparent p-0 font-sans text-[11px] font-medium text-current opacity-55 sm:inline-flex">
          {kbd}
        </Kbd>
      </span>
      <span className={`col-start-1 row-start-1 ${status === "working" ? "" : "invisible"}`}>
        {working}
      </span>
      <span className={`col-start-1 row-start-1 ${status === "done" ? "" : "invisible"}`}>
        {done}
      </span>
      <span className={`col-start-1 row-start-1 ${status === "error" ? "" : "invisible"}`}>
        Failed
      </span>
    </span>
  );
}

/** The dialog footer: customize, save and copy. */
function QuoteActions({
  customize,
  onCustomizeChange,
  action,
  status,
  statusText,
  onSave,
  onCopy,
}: QuoteActionsProps) {
  const working = status === "working";
  const saveStatus: Status = action === "save" ? status : "idle";
  const copyStatus: Status = action === "copy" ? status : "idle";

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

      <Button
        type="button"
        variant="secondary"
        onClick={onSave}
        disabled={working}
        title={saveStatus === "error" ? statusText : undefined}
        className="h-8 min-w-[108px] gap-1.5 rounded-md !bg-foreground/[0.06] px-3 text-[13.5px] font-medium text-foreground hover:!bg-foreground/[0.08]"
      >
        {saveStatus === "working" ? (
          <SpinnerGap className="size-3.5 animate-spin text-muted-foreground" />
        ) : saveStatus === "done" ? (
          <Check className="size-3.5 text-muted-foreground" />
        ) : saveStatus === "error" ? (
          <WarningCircle className="size-3.5 text-muted-foreground" />
        ) : (
          <DownloadSimple className="size-3.5 text-muted-foreground" />
        )}
        <ActionLabel status={saveStatus} idle="Save image" working="Saving…" done="Saved" kbd="⌘S" />
      </Button>

      <Button
        type="button"
        onClick={onCopy}
        disabled={working}
        title={copyStatus === "error" ? statusText : undefined}
        className="h-8 min-w-[112px] gap-1.5 rounded-md bg-foreground px-3 text-[13.5px] font-semibold text-background hover:bg-foreground/90 active:scale-[0.97]"
      >
        {copyStatus === "working" ? (
          <SpinnerGap className="size-3.5 animate-spin opacity-70" />
        ) : copyStatus === "done" ? (
          <Check className="size-3.5 opacity-70" />
        ) : copyStatus === "error" ? (
          <WarningCircle className="size-3.5 opacity-70" />
        ) : (
          <CopyIcon className="size-3.5 opacity-70" />
        )}
        <ActionLabel status={copyStatus} idle="Copy image" working="Copying…" done="Copied" kbd="⌘C" />
      </Button>

      <span aria-live="polite" className="sr-only">
        {status !== "idle" ? statusText : ""}
      </span>
    </div>
  );
}

export { QuoteActions };