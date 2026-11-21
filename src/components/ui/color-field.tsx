"use client";

import * as React from "react";
import { Eyedropper, Plus } from "@phosphor-icons/react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Swatch, SwatchGroup } from "@/components/ui/swatch";
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
  presets: string[];
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
 * The custom picker expands inside the panel instead of floating over the card
 * it is changing. `react-colorful` owns the saturation/hue maths and keyboard
 * handling; this component owns the row, the presets and the hex field.
 */
function ColorField({
  label,
  value,
  onChange,
  presets,
  valueLabel,
  extra,
  allowCustom = true,
  className,
}: ColorFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [eyedropper, setEyedropper] = React.useState(false);
  const id = `color-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const unique = React.useMemo(() => Array.from(new Set(presets)), [presets]);

  React.useEffect(() => {
    setEyedropper(
      typeof window !== "undefined" &&
        "EyeDropper" in (window as unknown as Record<string, unknown>)
    );
  }, []);

  const pickPreset = (next: string) => {
    setOpen(false);
    onChange(next);
  };

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
    <div className={cn("py-1.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-[13px] font-normal text-foreground">
          {label}
        </Label>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {valueLabel ?? value.toUpperCase()}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        {extra && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setOpen(false);
              extra.onSelect();
            }}
            aria-label={`${label}: ${extra.label}`}
            aria-pressed={extra.active}
            title={extra.label}
            style={{ background: extra.background }}
            className={cn(
              "size-6 flex-none rounded-full p-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] transition-transform duration-150 hover:scale-110 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]",
              extra.active &&
                "ring-2 ring-foreground ring-offset-2 ring-offset-background"
            )}
          />
        )}

        <SwatchGroup
          value={extra?.active ? "" : value}
          onValueChange={pickPreset}
          className="gap-1.5"
        >
          {unique.map((preset) => (
            <Swatch
              key={preset}
              value={preset}
              background={preset}
              label={preset}
              variant="scale"
            />
          ))}
        </SwatchGroup>

        {allowCustom && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            id={id}
            aria-label={`${label}: custom colour`}
            aria-expanded={open}
            aria-controls={`${id}-picker`}
            onClick={() => setOpen((current) => !current)}
            className={cn(
              "relative ml-auto size-6 shrink-0 rounded-full p-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] transition-transform duration-150 hover:scale-110 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]",
              open && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
            )}
            style={{
              background:
                "conic-gradient(from 90deg, #f87171, #fbbf24, #4ade80, #38bdf8, #a78bfa, #f87171)",
            }}
          >
            <span className="pointer-events-none absolute inset-[3px] rounded-full bg-background" />
            <Plus
              aria-hidden="true"
              className="pointer-events-none relative size-3 text-foreground"
            />
          </Button>
        )}
      </div>

      {open && (
        <div
          id={`${id}-picker`}
          data-slot="color-picker"
          className="mt-2 rounded-xl border border-border bg-foreground/[0.025] p-2.5 shadow-sm"
        >
          <HexColorPicker
            color={value}
            onChange={onChange}
            className="!h-36 !w-full [&_.react-colorful__hue]:!h-3 [&_.react-colorful__hue]:!rounded-full [&_.react-colorful__saturation]:!rounded-lg [&_.react-colorful__pointer]:!size-4"
          />
          <div className="mt-2.5 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-6 flex-none rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
              style={{ background: value }}
            />
            <HexColorInput
              color={value}
              onChange={onChange}
              prefixed
              aria-label={`${label} hex value`}
              className="h-7 w-[86px] rounded-md border border-border bg-background px-2 font-mono text-[11px] uppercase tracking-wide text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <div className="ml-auto flex items-center gap-1">
              {eyedropper && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={pickFromScreen}
                  aria-label={`Pick ${label.toLowerCase()} from the screen`}
                  title="Pick from screen"
                  className="size-7 text-muted-foreground"
                >
                  <Eyedropper className="size-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-7 px-2 text-[12px] font-normal text-muted-foreground"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { ColorField };
