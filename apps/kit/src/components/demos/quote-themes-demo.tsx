"use client";

import { Swatch, SwatchGroup } from "@/components/ui/swatch";
import { THEMES, themeById } from "@/components/quote/themes";

export function QuoteThemesDemo() {
  return (
    <div className="flex flex-col gap-3">
      {THEMES.map((theme) => (
        <div key={theme.id} className="flex items-center gap-3">
          <span className="w-16 text-sm capitalize text-muted-foreground">
            {themeById(theme.id).name}
          </span>
          <SwatchGroup value="0" aria-label={`${theme.name} variants`}>
            {theme.variants.map((variant, index) => (
              <Swatch
                key={index}
                value={String(index)}
                background={variant.swatch}
                label={`${theme.name} ${index + 1}`}
                variant="scale"
              />
            ))}
          </SwatchGroup>
        </div>
      ))}
    </div>
  );
}
