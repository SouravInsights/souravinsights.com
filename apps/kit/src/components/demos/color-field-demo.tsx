"use client";

import { useState } from "react";
import { ColorField } from "@/components/ui/color-field";

export function ColorFieldDemo() {
  const [value, setValue] = useState("#f4e58a");

  return (
    <div className="w-64">
      <ColorField label="Highlight" value={value} onChange={setValue} />
    </div>
  );
}
