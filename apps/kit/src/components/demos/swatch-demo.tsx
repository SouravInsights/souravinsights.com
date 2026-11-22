"use client";

import { useState } from "react";
import { Swatch, SwatchGroup } from "@/components/ui/swatch";

const COLORS = [
  { name: "Amber", color: "#f4e58a" },
  { name: "Apricot", color: "#f4b071" },
  { name: "Gold", color: "#e8b53a" },
  { name: "Mint", color: "#8fe3b8" },
  { name: "Sky", color: "#8fc4e3" },
  { name: "Iris", color: "#b3a4f0" },
  { name: "Rose", color: "#f0a4c8" },
];

export function SwatchDemo() {
  const [value, setValue] = useState("3");

  return (
    <SwatchGroup value={value} onValueChange={setValue} aria-label="Colour">
      {COLORS.map((color, index) => (
        <Swatch
          key={color.name}
          value={String(index)}
          background={color.color}
          label={color.name}
          variant="scale"
        />
      ))}
    </SwatchGroup>
  );
}
