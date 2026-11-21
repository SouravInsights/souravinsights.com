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
  presets?: string[];
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
 * The closed state is one calm row: dot, label, value. Opening it expands the
 * same surface into the picker, so the control never floats over the card it is
 * changing. `react-colorful` owns the saturation/hue maths and keyboard support.
 */
function ColorField({
  label,
  value,
  onChange,
  presets = [],
  valueLabel,
  extra,
  allowCustom = true,
  className,
}: ColorFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [eyedropper, setEyedropper] = React.useState(false);
  const id = `color-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const unique = React.useMemo(() => Array.from(new Set(presets)), [presets]);
  const shown = extra?.active ? extra.background : value;

  React.useEffect(() => {
    setEyedropper(
      typeof window !== "undefined" &&
        "EyeDropper" in (window as unknown as Record<string, unknown>)
    );
  }, []);

  const pickPreset = (next: string) => {
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
    <div
      data-slot="color-field"
      className={cn("rounded-lg bg-foreground/[0.045] p-3", className)}
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
            "size-7 flex-none rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] transition-[scale,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]",
            allowCustom &&
              "[@media(hover:hover)]:hover:scale-105 motion-safe:active:scale-95",
            open && "ring-2 ring-foreground/70 ring-offset-2 ring-offset-background"
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
        <div id={`${id}-picker`} className="mt-3.5">
          <HexColorPicker
            color={value}
            onChange={onChange}
            className="!h-32 !w-full [&_.react-colorful__hue]:!h-3 [&_.react-colorful__hue]:!rounded-full [&_.react-colorful__saturation]:!rounded-lg [&_.react-colorful__pointer]:!size-4 [&_.react-colorful__pointer]:!border-2"
          />

          <div className="mt-3 flex items-center gap-2">
            <HexColorInput
              color={value}
              onChange={onChange}
              prefixed
              aria-label={`${label} hex value`}
              className="h-8 min-w-0 flex-1 rounded-lg border-0 bg-background/60 px-2.5 font-mono text-[12px] uppercase tracking-wide text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            {eyedropper && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={pickFromScreen}
                aria-label={`Pick ${label.toLowerCase()} from the screen`}
                title="Pick from screen"
                className="size-8 text-muted-foreground"
              >
                <Eyedropper className="size-3.5" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 px-2 text-[12px] font-normal text-muted-foreground"
            >
              Done
            </Button>
          </div>

          {(unique.length > 0 || extra) && (
            <div className="mt-3 flex items-center gap-1.5">
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
                    "size-6 flex-none rounded-full p-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] transition-transform duration-150 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]",
                    extra.active &&
                      "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  )}
                />
              )}
              {unique.length > 0 && (
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
              )}
              <div className="ml-auto" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { ColorField };
