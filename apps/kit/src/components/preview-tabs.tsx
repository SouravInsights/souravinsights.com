"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface PreviewFile {
  path: string;
  content: string;
}

export function PreviewTabs({
  preview,
  files,
  className,
}: {
  preview: React.ReactNode;
  files: PreviewFile[];
  className?: string;
}) {
  const [value, setValue] = React.useState("preview");

  return (
    <div
      data-slot="component-preview"
      className={cn(
        "group relative my-4 overflow-hidden rounded-xl border",
        className
      )}
    >
      <Tabs value={value} onValueChange={setValue}>
        <div className="flex items-center justify-between border-b bg-muted/40 px-2 py-1.5">
          <TabsList className="h-7 bg-transparent p-0">
            <TabsTrigger value="preview" className="h-6 px-2 text-xs">
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="h-6 px-2 text-xs">
              Code
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="preview" className="m-0">
          <div className="flex min-h-[220px] items-center justify-center p-6">
            {preview}
          </div>
        </TabsContent>

        <TabsContent value="code" className="m-0">
          <div className="max-h-[420px] overflow-auto">
            {files.map((file) => (
              <div key={file.path}>
                <div className="sticky top-0 border-b bg-muted/60 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
                  {file.path}
                </div>
                <pre className="overflow-x-auto px-3 py-3 text-[12px] leading-5">
                  <code>{file.content}</code>
                </pre>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
