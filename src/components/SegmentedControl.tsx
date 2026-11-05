"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useFeedback } from "@/hooks/useFeedback";

export interface SegmentedOption<T extends string> {
  value: T;
  /** Accessible name; the control is icon-only. */
  label: string;
  icon: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Unique per control, so the sliding pill animates within its own group. */
  layoutId: string;
}

/**
 * The icon segmented control used for view choices. Extracted from the insights
 * list so the gallery's column picker is the same control, not a second take on
 * it. Owns the sliding pill and the selection feedback.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
}: SegmentedControlProps<T>) {
  const feedback = useFeedback();

  return (
    <div className="flex h-10 items-center gap-2 sm:h-9">
      <div className="flex h-full items-center gap-0.5 rounded-lg border border-border p-0.5">
        {options.map(({ value: optionValue, label, icon: Icon }) => {
          const active = value === optionValue;
          return (
            <button
              key={optionValue}
              type="button"
              onClick={() => {
                feedback.select();
                onChange(optionValue);
              }}
              aria-label={label}
              aria-pressed={active}
              className={`relative flex h-full aspect-square items-center justify-center rounded-[5px] transition-colors after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] ${
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-[5px] bg-foreground/10"
                  transition={{ type: "spring", stiffness: 520, damping: 42 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
