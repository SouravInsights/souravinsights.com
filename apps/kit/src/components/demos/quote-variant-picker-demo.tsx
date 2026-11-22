"use client";

import { useState } from "react";
import { QuoteVariantPicker } from "@/components/quote/variant-picker";
import { THEMES } from "@/components/quote/themes";

export function QuoteVariantPickerDemo() {
  const [value, setValue] = useState(0);
  const theme = THEMES[0];

  return (
    <QuoteVariantPicker
      variants={theme.variants}
      value={value}
      onValueChange={setValue}
      label={`${theme.name} colours`}
    />
  );
}
