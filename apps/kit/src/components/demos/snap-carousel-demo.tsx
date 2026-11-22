"use client";

import { useState } from "react";
import { SnapCarousel, SnapCarouselContent, SnapCarouselItem } from "@/components/ui/snap-carousel";

const ITEMS = ["one", "two", "three", "four", "five"];

export function SnapCarouselDemo() {
  const [value, setValue] = useState("three");

  return (
    <SnapCarousel items={ITEMS} value={value} onValueChange={setValue} gap={12}>
      <SnapCarouselContent className="flex w-full items-center py-4">
        {ITEMS.map((id) => (
          <SnapCarouselItem
            key={id}
            value={id}
            onClick={() => setValue(id)}
            className="flex h-32 w-40 cursor-pointer items-center justify-center rounded-xl border bg-card text-sm capitalize"
          >
            {id}
          </SnapCarouselItem>
        ))}
      </SnapCarouselContent>
    </SnapCarousel>
  );
}
