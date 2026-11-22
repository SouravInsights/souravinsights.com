"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { snap } from "@/lib/highlight-anchor";

const TEXT =
  "The best interfaces disappear. You stop noticing the buttons and the panels and the type.";

const RANGES: [number, number][] = [
  [4, 8],
  [12, 26],
  [37, 50],
];

export function HighlightAnchorDemo() {
  const [range, setRange] = useState<[number, number]>(RANGES[0]);
  const [start, end] = snap(TEXT, range[0], range[1]);

  return (
    <div className="flex w-full max-w-prose flex-col items-start gap-4">
      <p className="text-[15px] leading-7">
        {TEXT.slice(0, start)}
        <mark className="rounded-[0.22em] bg-[#f4e58a] px-0.5 text-black">
          {TEXT.slice(start, end)}
        </mark>
        {TEXT.slice(end)}
      </p>
      <div className="flex gap-2">
        {RANGES.map((value, index) => (
          <Button key={index} variant="outline" size="sm" onClick={() => setRange(value)}>
            Range {index + 1}
          </Button>
        ))}
      </div>
    </div>
  );
}
