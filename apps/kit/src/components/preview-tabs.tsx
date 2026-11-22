"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface PreviewFile {
  path: string;
  content: string;
}

/**
 * A demo with its source underneath. The source is clipped behind a
 * "View Code" button until the reader asks for it, like the shadcn docs.
 */
export function PreviewTabs({
  preview,
  source,
  className,
}: {
  preview: React.ReactNode;
  source: React.ReactNode;
  className?: string;
}) {
  const [showCode, setShowCode] = React.useState(false);

  return (
    <div
      data-slot="component-preview"
      className={cn(
        "group relative my-6 flex flex-col overflow-hidden rounded-xl border",
        className
      )}
    >
      <div className="flex min-h-72 w-full items-center justify-center p-10">
        {preview}
      </div>

      <div className="relative border-t">
        {showCode ? (
          <div className="[&_[data-slot=component-source]]:m-0 [&_[data-slot=component-source]]:rounded-none [&_[data-slot=component-source]]:border-0">
            {source}
          </div>
        ) : (
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none max-h-52 overflow-hidden"
            >
              {source}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background via-background/85 to-transparent">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="relative z-10"
                onClick={() => setShowCode(true)}
              >
                View Code
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
