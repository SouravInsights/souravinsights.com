import sources from "@/generated/sources.json";
import { CodeSnippet } from "@/components/code-snippet";

type SourceFile = { path: string; content: string };

/**
 * The source of a registry item (or a demo), read from the generated
 * `sources.json`. One highlighted, copyable block per file.
 */
export function ComponentSource({
  name,
  maxLines,
}: {
  name: string;
  maxLines?: number;
}) {
  const files = (sources as Record<string, SourceFile[]>)[name] ?? [];
  if (!files.length) return null;

  return (
    <div
      data-slot="component-source"
      className="my-6 overflow-hidden rounded-xl border"
    >
      {files.map((file) => {
        const code = maxLines
          ? file.content.split("\n").slice(0, maxLines).join("\n")
          : file.content;
        return (
          <div key={file.path} className="border-b last:border-b-0">
            <CodeSnippet code={code} title={file.path} />
          </div>
        );
      })}
    </div>
  );
}
