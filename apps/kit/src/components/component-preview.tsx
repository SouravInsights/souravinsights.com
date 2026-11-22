import { demos } from "@/lib/demos";
import { ComponentSource } from "@/components/component-source";
import { PreviewTabs } from "@/components/preview-tabs";

export function ComponentPreview({ name, className }: { name: string; className?: string }) {
  const Demo = demos[name];

  if (!Demo) {
    return (
      <p className="my-4 text-sm text-muted-foreground">
        Demo <code>{name}</code> not found.
      </p>
    );
  }

  return (
    <PreviewTabs
      className={className}
      preview={<Demo />}
      source={<ComponentSource name={name} />}
    />
  );
}
