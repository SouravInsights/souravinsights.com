"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  ColorPicker,
  ColorPickerBrightness,
  ColorPickerHex,
  ColorPickerSide,
  ColorPickerWheel,
} from "@/components/ui/color-picker";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface ColorFieldExtra {
  /** Any CSS background, e.g. the design's gradient swatch. */
  background: string;
  label: string;
  active?: boolean;
  onSelect: () => void;
}

export interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Shown instead of the raw value, e.g. "Gradient". */
  valueLabel?: string;
  /** An extra swatch that is an action, not a preset. */
  extra?: ColorFieldExtra;
  allowCustom?: boolean;
  /** Controlled open state; omit for a standalone field. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/**
 * A colour role, edited in place.
 *
 * Closed: one quiet row. Open: the row grows into the picker, with the wheel,
 * brightness rail and hex on the same surface. The picker itself is composed
 * from ColorPicker parts; this component only owns the row.
 */
function ColorField({
  label,
  value,
  onChange,
  valueLabel,
  extra,
  allowCustom = true,
  open: controlledOpen,
  onOpenChange,
  className,
}: ColorFieldProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const id = `color-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const shown = extra?.active ? extra.background : value;

  return (
    <div
      data-slot="color-field"
      data-state={open ? "open" : "closed"}
      className={cn(
        "-mx-2 rounded-md transition-colors duration-150",
        open
          ? "bg-foreground/[0.055]"
          : "[@media(hover:hover)]:hover:bg-foreground/[0.035]",
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        id={id}
        aria-label={`${label}: ${valueLabel ?? value}`}
        aria-expanded={open}
        aria-controls={`${id}-picker`}
        disabled={!allowCustom}
        onClick={() => setOpen(!open)}
        className="h-9 w-full justify-start gap-2.5 rounded-md px-2 text-left font-normal hover:bg-transparent disabled:opacity-100"
      >
        <span
          style={{ background: shown }}
          className="size-5 flex-none rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
        />
        <Label className="flex-1 text-[13px] font-normal leading-[18px] text-foreground/85">
          {label}
        </Label>
        <span className="text-[12px] tabular-nums text-faint-foreground">
          {valueLabel ?? value.toUpperCase()}
        </span>
      </Button>

      {open && (
        <div id={`${id}-picker`} className="px-2 pb-3 pt-1">
          <ColorPicker value={value} onChange={onChange}>
            <ColorPickerWheel />
            <ColorPickerSide>
              <ColorPickerBrightness />
              <ColorPickerHex
                trailing={
                  extra ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={extra.onSelect}
                      aria-label={extra.label}
                      aria-pressed={extra.active}
                      title={extra.label}
                      style={{ background: extra.background }}
                      className={cn(
                        "size-6 flex-none rounded-full p-0 hover:bg-transparent",
                        extra.active &&
                          "ring-2 ring-[hsl(var(--foreground))] ring-offset-2 ring-offset-background"
                      )}
                    />
                  ) : undefined
                }
              />
            </ColorPickerSide>
          </ColorPicker>
        </div>
      )}
    </div>
  );
}

export { ColorField };
