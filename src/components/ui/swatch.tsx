"use client";

import * as React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

/**
 * A colour swatch, and the group that makes it a radio choice.
 *
 * The swatch is only the control: any CSS background works (flat colour,
 * gradient, radial dot). Selected and hover treatments come from
 * `data-[state=checked]`; consumers can override them with `className`.
 */
function SwatchGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroup>) {
  return (
    <RadioGroup
      data-slot="swatch-group"
      className={cn("flex items-center gap-1.5", className)}
      {...props}
    />
  );
}

function Swatch({
  className,
  background,
  label,
  size = "md",
  ...props
}: React.ComponentProps<typeof RadioGroupItem> & {
  /** any CSS background: a colour, a gradient, a radial dot */
  background: string;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <RadioGroupItem
      data-slot="swatch"
      aria-label={label}
      title={label}
      style={{ background }}
      className={cn(
        "flex-none overflow-hidden rounded-full border-0 p-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] transition-shadow duration-150 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]",
        "hover:shadow-[0_0_0_2px_hsl(var(--card)),0_0_0_3px_hsl(var(--muted-foreground))]",
        "data-[state=checked]:shadow-[0_0_0_2px_hsl(var(--card)),0_0_0_3.5px_hsl(var(--foreground))]",
        size === "sm" ? "size-6" : "size-7",
        "[&_svg]:hidden",
        className
      )}
      {...props}
    />
  );
}

export { Swatch, SwatchGroup };