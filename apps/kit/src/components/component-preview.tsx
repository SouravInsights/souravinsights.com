import * as React from "react";
import { demos } from "@/lib/demos";
import { PreviewTabs, type PreviewFile } from "@/components/preview-tabs";
import sources from "@/generated/sources.json";

export function ComponentPreview({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Demo = demos[name];

  if (!Demo) {
    return (
      <p className="my-4 text-sm text-muted-foreground">
        Demo <code>{name}</code> not found.
      </p>
    );
  }

  const files = (sources as Record<string, PreviewFile[]>)[name] ?? [];

  return (
    <PreviewTabs
      className={className}
      preview={<Demo />}
      files={files}
    />
  );
}
