import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PanelProps {
  title: string;
  /** When set, the panel's label links there, with the arrow the site uses. */
  href?: string;
  /** Trailing control on the label line — a count, a filter, a toggle. */
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * A dashboard panel: a bordered card, one terse label line, then content.
 *
 * The old shape was a `SectionHeader` over a long column — a document. The same
 * content in a bordered box with its own label is a widget, and a screen of
 * widgets is where "this feels like an app" comes from: fixed frames, edges you
 * can scan, and no requirement to read downwards in one unbroken line.
 *
 * Labels are terse on purpose. The description belongs on the page the panel
 * points at, not in the frame you are reading it from.
 */
export function Panel({
  title,
  href,
  action,
  className,
  bodyClassName,
  children,
}: PanelProps) {
  const label = (
    <span className="inline-flex items-center gap-1.5">
      {title}
      {href ? (
        <ArrowUpRight
          aria-hidden="true"
          className="h-3.5 w-3.5 -translate-x-1 translate-y-1 opacity-0 transition-all duration-200 group-hover/panel:translate-x-0 group-hover/panel:translate-y-0 group-hover/panel:opacity-100"
        />
      ) : null}
    </span>
  );

  return (
    <Card
      className={cn(
        // Card already ships `rounded-lg border bg-card` — the radius the hero
        // uses, so this stays consistent by default. Two of its defaults are
        // undone on purpose: `shadow-sm`, because no other card on this site
        // casts one, and the flex gap, because this header is a rule rather
        // than a margin.
        "group/panel flex min-h-0 flex-col gap-0 overflow-hidden py-0 shadow-none",
        className
      )}
    >
      <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-3 space-y-0 border-b border-border px-4 py-2.5">
        {/* Not CardTitle: that is an h3 at display size, and a panel is a
            section of the page, so h1 → h3 would skip a level an audit flags. */}
        <h2 className="type-label text-muted-foreground">
          {href ? (
            <Link
              href={href}
              className="inline-flex items-center transition-colors hover:text-green-700 dark:hover:text-green-500"
            >
              {label}
            </Link>
          ) : (
            label
          )}
        </h2>
        {action}
      </CardHeader>

      <CardContent className={cn("min-h-0 flex-1 p-4", bodyClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
