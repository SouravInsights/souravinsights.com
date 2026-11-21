"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "@phosphor-icons/react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const swatchVariants = cva(
  "group relative flex-none rounded-full border-0 p-0 transition-[box-shadow,outline-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] [&>span]:hidden",
  {
    variants: {
      variant: {
        /** Quote designs: a crisp outline with a gap, like a selected radio. */
        ring: [
          "size-7 overflow-hidden outline-2 outline-transparent outline-offset-2",
          "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]",
          "[@media(hover:hover)]:data-[state=unchecked]:hover:outline-foreground/20",
          "data-[state=checked]:outline-foreground",
        ],
        /** Highlight colours: a coloured outline with a hairline inner ring. */
        outline: [
          "size-6 outline-2 outline-transparent outline-offset-2",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:ring-1 before:ring-foreground/10 before:ring-inset",
          "[@media(hover:hover)]:data-[state=unchecked]:hover:outline-foreground/25",
        ],
        /** Preset colours: lift on hover, ring on selection. */
        scale: [
          "size-6",
          "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]",
          "[@media(hover:hover)]:hover:scale-110",
          "data-[state=checked]:ring-2 data-[state=checked]:ring-foreground data-[state=checked]:ring-offset-2 data-[state=checked]:ring-offset-background",
        ],
      },
    },
    defaultVariants: { variant: "ring" },
  }
);

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
  variant,
  style,
  ...props
}: React.ComponentProps<typeof RadioGroupItem> &
  VariantProps<typeof swatchVariants> & {
    /** any CSS background: a colour, a gradient, a radial dot */
    background: string;
    label: string;
  }) {
  const selected = variant ?? "ring";

  return (
    <RadioGroupItem
      data-slot="swatch"
      aria-label={label}
      title={label}
      style={{ background, ...style }}
      className={cn(swatchVariants({ variant }), className)}
      {...props}
    >
      {selected === "ring" && (
        <Check
          data-check=""
          aria-hidden="true"
          weight="bold"
          className="pointer-events-none absolute inset-0 m-auto size-3.5 text-white opacity-0 mix-blend-difference transition-opacity duration-150 group-data-[state=checked]:opacity-100"
        />
      )}
    </RadioGroupItem>
  );
}

export { Swatch, SwatchGroup, swatchVariants };
