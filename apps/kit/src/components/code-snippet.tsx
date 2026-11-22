import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { cn } from "@/lib/utils";

/** A highlighted, copyable code block. */
export function CodeSnippet({
  code,
  lang = "tsx",
  title,
  className,
}: {
  code: string;
  lang?: string;
  title?: string;
  className?: string;
}) {
  return (
    <DynamicCodeBlock
      lang={lang}
      code={code}
      codeblock={{
        title,
        className: cn("my-0 rounded-none border-0 shadow-none", className),
      }}
    />
  );
}
