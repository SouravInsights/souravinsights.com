"use client";

import * as React from "react";
import { Eyedropper } from "@phosphor-icons/react";
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
  /** Controlled open state; omit for a standalone field. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
};

type Hsv = { h: number; s: number; v: number };

const WHEEL = 108;

function hexToHsv(hex: string): Hsv {
  const match = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!match) return { h: 0, s: 0, v: 1 };
  const n = Number.parseInt(match[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  let h = 0;
  if (delta) {
    h =
      max === r
        ? ((g - b) / delta) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? delta / max : 0, v: max };
}

function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return (
    "#" +
    [f(5), f(3), f(1)]
      .map((c) => Math.round(c * 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** The wheel plus a brightness rail and a hex field. */
function ColorPicker({
  value,
  onChange,
  eyedropper,
  onPick,
  extra,
}: {
  value: string;
  onChange: (value: string) => void;
  eyedropper: boolean;
  onPick: () => Promise<void>;
  extra?: ColorFieldExtra;
}) {
  const [hsv, setHsv] = React.useState<Hsv>(() => hexToHsv(value));
  const wheelRef = React.useRef<HTMLDivElement>(null);
  const [text, setText] = React.useState(value);
  const editing = React.useRef(false);
  /** The last hex this picker emitted; do not echo it back into HSV. */
  const emitted = React.useRef<string | null>(null);

  React.useEffect(() => {
    const next = value.toLowerCase();
    if (next === emitted.current) return;
    emitted.current = next;
    setHsv(hexToHsv(next));
  }, [value]);

  React.useEffect(() => {
    if (!editing.current) setText(value);
  }, [value]);

  const update = (next: Hsv) => {
    const hex = hsvToHex(next);
    emitted.current = hex;
    setHsv(next);
    onChange(hex);
  };

  const point = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = wheelRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = event.clientX - (box.left + box.width / 2);
    const y = event.clientY - (box.top + box.height / 2);
    const h = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
    const s = Math.min(1, Math.hypot(x, y) / (box.width / 2));
    // At zero brightness every hue is black; a wheel drag means "show me this
    // hue", so lift the value back to full and let the rail follow.
    update({ ...hsv, h, s, v: hsv.v || 1 });
  };

  const angle = ((hsv.h - 90) * Math.PI) / 180;
  const dot = {
    left: WHEEL / 2 + Math.cos(angle) * hsv.s * (WHEEL / 2),
    top: WHEEL / 2 + Math.sin(angle) * hsv.s * (WHEEL / 2),
  };

  return (
    <div className="flex items-center gap-3.5">
      <div
        ref={wheelRef}
        role="group"
        aria-label="Colour wheel"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          point(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) point(event);
        }}
        style={{
          width: WHEEL,
          height: WHEEL,
          background:
            "radial-gradient(circle closest-side, #fff, transparent), conic-gradient(red, #ff0, #0f0, #0ff, #00f, #f0f, red)",
        }}
        className="relative flex-none cursor-crosshair touch-none rounded-full"
      >
        <span
          aria-hidden="true"
          style={{
            left: dot.left,
            top: dot.top,
            background: hsvToHex({ ...hsv, v: hsv.v || 1 }),
          }}
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2.5px_#fff,0_0_0_3.5px_rgba(0,0,0,0.25),0_2px_6px_rgba(0,0,0,0.3)]"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3.5">
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(hsv.v * 100)}
          aria-label="Brightness"
          onChange={(event) =>
            update({ ...hsv, v: Number(event.target.value) / 100 })
          }
          style={{
            background: `linear-gradient(to right, #000, ${hsvToHex({ ...hsv, v: 1 })})`,
          }}
          className="h-3 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-track]:h-3 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-3 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:-mt-0.5 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_1px_4px_rgba(0,0,0,0.3)]"
        />

        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-6 flex-none rounded-md shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.2)]"
            style={{ background: value }}
          />
          <div className="relative min-w-0 flex-1">
            <input
              aria-label="Hex colour"
              value={text}
              spellCheck={false}
              onFocus={() => {
                editing.current = true;
              }}
              onBlur={() => {
                editing.current = false;
                setText(value);
              }}
              onChange={(event) => {
                const next = event.target.value.trim();
                setText(next);
                const hex = next.startsWith("#") ? next : `#${next}`;
                if (/^#[0-9a-f]{6}$/i.test(hex)) onChange(hex.toLowerCase());
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="h-7 w-full rounded-md border-0 bg-background/60 px-2 pr-8 font-mono text-[11px] tabular-nums text-foreground/80 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            {eyedropper && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void onPick();
                }}
                aria-label="Pick colour from the screen"
                title="Pick from screen"
                className="absolute right-1 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-faint-foreground transition-colors hover:text-foreground"
              >
                <Eyedropper className="size-3.5" />
              </button>
            )}
          </div>
          {extra && (
            <button
              type="button"
              onClick={extra.onSelect}
              aria-label={extra.label}
              aria-pressed={extra.active}
              title={extra.label}
              style={{ background: extra.background }}
              className={cn(
                "size-6 flex-none rounded-full p-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]",
                extra.active &&
                  "ring-2 ring-foreground ring-offset-2 ring-offset-background"
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A colour role, edited in place.
 *
 * Closed: one quiet row. Open: the row grows into the picker, with the wheel,
 * brightness rail and hex on the same surface. No floating panel over the card.
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
        "-mx-2 rounded-lg transition-colors duration-150",
        open
          ? "bg-foreground/[0.055]"
          : "[@media(hover:hover)]:hover:bg-foreground/[0.035]",
        className
      )}
    >
      <button
        type="button"
        id={id}
        aria-label={`${label}: ${valueLabel ?? value}`}
        aria-expanded={open}
        aria-controls={`${id}-picker`}
        disabled={!allowCustom}
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left"
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
      </button>

      {open && (
        <div id={`${id}-picker`} className="px-2 pb-3 pt-1">
          <ColorPicker
            value={value}
            onChange={onChange}
            eyedropper={eyedropper}
            onPick={pickFromScreen}
            extra={extra}
          />

        </div>
      )}
    </div>
  );
}

export { ColorField };
