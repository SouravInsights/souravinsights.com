"use client";

import { Swatch, SwatchGroup } from "@/components/ui/swatch";
import type { Variant } from "./themes";

export interface QuoteVariantPickerProps {
  variants: Variant[];
  value: number;
  onValueChange: (index: number) => void;
  label: string;
  /** The colours were hand-picked, so no preset is selected. */
  custom?: boolean;
}

function QuoteVariantPicker({
  variants,
  value,
  onValueChange,
  label,
  custom = false,
}: QuoteVariantPickerProps) {
  return (
    <div className="relative" style={{ marginTop: -10 }}>
      <SwatchGroup
        aria-label={label}
        value={custom ? "" : String(value)}
        onValueChange={(next) => onValueChange(Number(next))}
        className="h-8 justify-center gap-2.5"
      >
        {variants.map((variant, index) => (
          <Swatch
            key={variant.name}
            value={String(index)}
            background={variant.swatch}
            label={variant.name}
            variant="ring"
          />
        ))}
      </SwatchGroup>
      {custom && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-faint-foreground">
          Custom
        </span>
      )}
    </div>
  );
}

export { QuoteVariantPicker };
