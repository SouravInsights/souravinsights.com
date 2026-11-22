import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { ComponentPreview } from "@/components/component-preview";
import { ComponentSource } from "@/components/component-source";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ComponentPreview,
    ComponentSource,

    Steps: ({ className, ...props }: React.ComponentProps<"div">) => (
      <div
        className={cn(
          "[counter-reset:step] md:ml-4 md:border-l md:pl-8 [&>h3]:mt-8 [&>h3:first-child]:mt-0",
          className,
        )}
        {...props}
      />
    ),
    Step: ({ className, ...props }: React.ComponentProps<"h3">) => (
      <h3
        className={cn(
          "step [counter-increment:step] text-base font-medium text-foreground before:mr-2 before:inline-flex before:size-6 before:items-center before:justify-center before:rounded-full before:bg-muted before:font-mono before:text-sm before:text-muted-foreground before:content-[counter(step)] md:before:absolute md:before:mt-[-4px] md:before:ml-[-50px] md:before:size-9 md:before:border-4 md:before:border-background",
          className,
        )}
        {...props}
      />
    ),

    Tabs: ({ className, ...props }: React.ComponentProps<typeof Tabs>) => (
      <Tabs className={cn("relative mt-6 w-full", className)} {...props} />
    ),
    TabsList: ({ className, ...props }: React.ComponentProps<typeof TabsList>) => (
      <TabsList
        className={cn("h-auto justify-start gap-4 rounded-none bg-transparent p-0", className)}
        {...props}
      />
    ),
    TabsTrigger: ({ className, ...props }: React.ComponentProps<typeof TabsTrigger>) => (
      <TabsTrigger
        className={cn(
          "rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-3 text-base text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none",
          className,
        )}
        {...props}
      />
    ),
    TabsContent: ({ className, ...props }: React.ComponentProps<typeof TabsContent>) => (
      <TabsContent
        className={cn("relative outline-none [&_[data-slot=component-source]]:mt-0", className)}
        {...props}
      />
    ),

    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
