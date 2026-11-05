"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useFeedback } from "@/hooks/useFeedback";

export interface FilterOption {
  value: string;
  label: string;
  /** Optional count shown on the right of the row. */
  count?: number;
}

interface FilterMenuProps {
  /** The active option's label, shown on the button. */
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  /** Mobile-only glyph; the label is hidden below `sm`. */
  icon?: LucideIcon;
  align?: "left" | "right";
}

/**
 * The one filter dropdown on the site. Extracted from the insights list so the
 * gallery's project filter is the same control, not a second interpretation of
 * it. Owns its open state, outside-click and Escape.
 */
export function FilterMenu({
  label,
  options,
  value,
  onChange,
  ariaLabel = "Filter",
  icon: Icon = SlidersHorizontal,
  align = "right",
}: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const feedback = useFeedback();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${label}`}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 type-caption font-medium text-foreground transition-colors hover:bg-foreground/5 sm:h-9"
      >
        <Icon className="h-4 w-4 shrink-0 sm:hidden" />
        <span className="hidden max-w-[7rem] truncate sm:inline">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-faint-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute top-full z-30 mt-1 max-h-[min(80svh,26rem)] w-auto min-w-[8rem] max-w-[min(72vw,13rem)] overflow-y-auto overscroll-contain rounded-lg [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:border-0 [&::-webkit-scrollbar]:w-1.5 border border-border bg-background p-1 shadow-lg shadow-black/5 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((option) => {
            const selected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  feedback.select();
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-[3px] px-3 py-1.5 text-left type-caption transition-colors sm:py-2 ${
                  selected
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
                }`}
              >
                <span className="truncate">{option.label}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {option.count !== undefined && (
                    <span className="tabular-nums text-faint-foreground">
                      {option.count}
                    </span>
                  )}
                  {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
