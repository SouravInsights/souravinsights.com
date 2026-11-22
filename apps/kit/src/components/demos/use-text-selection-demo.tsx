"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTextSelection } from "@/hooks/use-text-selection";

export function UseTextSelectionDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const paragraphs = useRef<HTMLElement[]>([]);
  const wordSelect = useRef(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (containerRef.current) {
      paragraphs.current = Array.from(
        containerRef.current.querySelectorAll("p")
      );
    }
  }, []);

  const read = useTextSelection({ containerRef, paragraphs, wordSelect });

  return (
    <div className="flex w-full max-w-prose flex-col items-start gap-4">
      <div ref={containerRef} className="text-[15px] leading-7">
        <p>
          The best interfaces disappear. Select a few words here, then read the
          selection.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const selection = read();
          if (!selection) return setText("");
          const el = paragraphs.current[selection.para];
          setText((el?.textContent ?? "").slice(selection.start, selection.end));
        }}
      >
        Read selection
      </Button>
      <p className="text-sm text-muted-foreground">
        {text ? `Selection: “${text}”` : "No selection read yet."}
      </p>
    </div>
  );
}
