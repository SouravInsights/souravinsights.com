"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface InlineEditFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Show the visibility switch. */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  className?: string;
}

/**
 * A meta field that reads as text and turns into a textarea on click.
 * The optional switch controls whether the field is drawn on the card.
 */
function InlineEditField({
  label,
  value,
  onChange,
  visible,
  onVisibleChange,
  className,
}: InlineEditFieldProps) {
  const [editing, setEditing] = React.useState(false);

  return (
    <div className={cn("flex min-h-[52px] items-center gap-3", className)}>
      <div className="min-w-0 flex-1">
        {editing ? (
          <Textarea
            autoFocus
            value={value}
            rows={2}
            spellCheck={false}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => setEditing(false)}
            className="min-h-0 resize-none bg-foreground/[0.06] px-2 py-1.5 text-[12.5px] leading-snug"
          />
        ) : (
          <Button
            type="button"
            variant="ghost"
            aria-label={`Edit ${label.toLowerCase()}`}
            onClick={() => setEditing(true)}
            className="group flex h-auto w-full items-center gap-2.5 rounded-lg px-0 py-3 text-left font-normal hover:bg-transparent"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="text-[15px] leading-5 text-foreground/90">
                {label}
              </span>
              <span className="truncate text-[13.5px] leading-[19px] text-muted-foreground/90">
                {value}
              </span>
            </span>
            <span className="flex-none text-[13px] font-medium text-muted-foreground/80 group-hover:text-foreground">
              Edit
            </span>
          </Button>
        )}
      </div>
      <div className="flex w-7 flex-none justify-end">
        {onVisibleChange !== undefined && (
          <Switch
            aria-label={`Show ${label.toLowerCase()}`}
            checked={!!visible}
            onCheckedChange={onVisibleChange}
          />
        )}
      </div>
    </div>
  );
}

export { InlineEditField };
