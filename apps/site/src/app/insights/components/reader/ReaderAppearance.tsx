"use client";

import { Minus, Plus, TextAa } from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * The reader's Appearance panel: the three things a reader actually changes
 * about the page they are reading, and nothing else.
 *
 * It lives in the reader's own header rather than in a settings page, because
 * the thing being changed is on screen — you move the size, the line length or
 * the face and watch the article answer. The choices stick across articles, so
 * they are made once.
 */

export interface Appearance {
  font: "sans" | "serif";
  /** percentage of the base text size */
  scale: number;
  width: "narrow" | "wide";
}

export const APPEARANCE_DEFAULT: Appearance = {
  font: "sans",
  scale: 100,
  width: "wide",
};

const SCALES = [90, 100, 110, 120, 130];
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";

/** The face and size the article is set in, as inline style. */
export function appearanceStyle(value: Appearance): React.CSSProperties {
  return {
    fontSize: `${value.scale}%`,
    ...(value.font === "serif" ? { fontFamily: SERIF } : null),
  };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex h-9 items-center justify-between gap-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
            value === option.value
              ? "bg-foreground/[0.08] text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ReaderAppearance({
  value,
  onChange,
}: {
  value: Appearance;
  onChange: (value: Appearance) => void;
}) {
  const index = SCALES.indexOf(value.scale);
  const step = (delta: number) => {
    const next = SCALES[Math.min(Math.max(index + delta, 0), SCALES.length - 1)];
    if (next !== undefined) onChange({ ...value, scale: next });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Appearance"
          title="Appearance"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <TextAa className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-64 p-3">
        <h2 className="mb-1.5 text-[13px] font-semibold text-foreground">Appearance</h2>

        <Row label="Font">
          <Segmented<Appearance["font"]>
            label="Font"
            value={value.font}
            onChange={(font) => onChange({ ...value, font })}
            options={[
              { value: "sans", label: "Sans" },
              { value: "serif", label: "Serif" },
            ]}
          />
        </Row>

        <Row label="Text size">
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
            <button
              type="button"
              aria-label="Smaller text"
              onClick={() => step(-1)}
              disabled={index <= 0}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground"
            >
              <Minus className="size-3" />
            </button>
            <span className="w-10 text-center text-[12.5px] font-medium tabular-nums text-foreground">
              {value.scale}%
            </span>
            <button
              type="button"
              aria-label="Larger text"
              onClick={() => step(1)}
              disabled={index >= SCALES.length - 1}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground"
            >
              <Plus className="size-3" />
            </button>
          </div>
        </Row>

        <Row label="Width">
          <Segmented<Appearance["width"]>
            label="Width"
            value={value.width}
            onChange={(width) => onChange({ ...value, width })}
            options={[
              { value: "narrow", label: "Narrow" },
              { value: "wide", label: "Wide" },
            ]}
          />
        </Row>
      </PopoverContent>
    </Popover>
  );
}
