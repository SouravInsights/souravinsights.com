"use client";

import * as React from "react";
import { Eyedropper } from "@phosphor-icons/react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
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
  className?: string;
}

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
};

/**
 * A colour role, edited in place.
 *
 * Closed: one calm row — dot, label, value. Open: the same surface grows into
 * a compact picker, saturation on the left and hue + hex on the right, like the
 * field it belongs to. `react-colorful` owns the colour maths and keyboard.
 */
function ColorField({
  label,
  value,
  onChange,
  valueLabel,
  extra,
  allowCustom = true,
  className,
}: ColorFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [eyedropper, setEyedropper] = React.useState(false);
  const id = `color-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const shown = extra?.active ? extra.background : value;

  React.useEffect(() => {
    setEyedropper(
      typeof window !== "undefined" &&
        "EyeDropper" in (window as unknown as Record<string, unknown>)
    );
  }, []);

  const pickFromScreen = async () => {
    const EyeDropper = (
      window as unknown as { EyeDropper?: EyeDropperConstructor }
    ).EyeDropper;
    if (!EyeDropper) return;
    try {
      const result = await new EyeDropper().open();
      onChange(result.sRGBHex);
    } catch {
      /* the user cancelled */
    }
  };

  return (
    <div
      data-slot="color-field"
      data-state={open ? "open" : "closed"}
      className={cn(
        "rounded-lg",
        open ? "bg-foreground/[0.045] p-3" : "px-0 py-2",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          id={id}
          aria-label={`${label}: ${valueLabel ?? value}`}
          aria-expanded={open}
          aria-controls={`${id}-picker`}
          disabled={!allowCustom}
          onClick={() => setOpen((current) => !current)}
          style={{ background: shown }}
          className={cn(
            "size-6 flex-none rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]",
            allowCustom && "[@media(hover:hover)]:hover:scale-105"
          )}
        />

        <Label
          htmlFor={id}
          className="text-[14px] font-normal leading-5 text-foreground"
        >
          {label}
        </Label>

        <span className="ml-auto text-[12px] tabular-nums text-muted-foreground">
          {valueLabel ?? value.toUpperCase()}
        </span>
      </div>

      {open && (
        <div id={`${id}-picker`} className="mt-3">
          <HexColorPicker
            color={value}
            onChange={onChange}
            className={cn(
              "!h-auto !w-full",
              "[&.react-colorful]:!grid [&.react-colorful]:!h-auto [&.react-colorful]:!w-full",
              "[&.react-colorful]:!grid-cols-[80px_1fr] [&.react-colorful]:!gap-3",
              "[&_.react-colorful__saturation]:!h-20 [&_.react-colorful__saturation]:!border-b-0 [&_.react-colorful__saturation]:!rounded-lg",
              "[&_.react-colorful__hue]:!h-3 [&_.react-colorful__hue]:!self-center [&_.react-colorful__hue]:!rounded-full",
              "[&_.react-colorful__pointer]:!size-4 [&_.react-colorful__pointer]:!border-2"
            )}
          />

          <div className="mt-2 flex items-center gap-1.5">
            <HexColorInput
              color={value}
              onChange={onChange}
              prefixed
              aria-label={`${label} hex value`}
              className="h-7 min-w-0 flex-1 rounded-md border-0 bg-background/60 px-2 font-mono text-[11px] uppercase tracking-wide text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            {eyedropper && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={pickFromScreen}
                aria-label={`Pick ${label.toLowerCase()} from the screen`}
                title="Pick from screen"
                className="size-7 flex-none text-muted-foreground"
              >
                <Eyedropper className="size-3.5" />
              </Button>
            )}
            {extra && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={extra.onSelect}
                aria-label={`${label}: ${extra.label}`}
                aria-pressed={extra.active}
                title={extra.label}
                style={{ background: extra.background }}
                className={cn(
                  "size-7 flex-none rounded-full p-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]",
                  extra.active &&
                    "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                )}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { ColorField };
