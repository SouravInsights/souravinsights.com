import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  /**
   * When set, the heading links there, with an arrow that animates in on hover.
   */
  href?: string;
}

/**
 * The heading used between sections inside a page. Matches PageHeader so a
 * section never reads louder or quieter than the page it sits on.
 */
export function SectionHeader({
  title,
  description,
  href,
}: SectionHeaderProps) {
  return (
    <div className="mb-8">
      {href ? (
        <h2>
          <Link
            href={href}
            className="group inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase leading-none tracking-[0.1em] text-foreground transition-colors hover:text-green-700 group-hover/section:text-green-700 dark:hover:text-green-500 dark:group-hover/section:text-green-500"
          >
            {title}
            <ArrowUpRight
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 -translate-x-1 translate-y-1 text-faint-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-green-700 group-hover:opacity-100 group-hover/section:translate-x-0 group-hover/section:translate-y-0 group-hover/section:text-green-700 group-hover/section:opacity-100 dark:group-hover:text-green-500 dark:group-hover/section:text-green-500"
            />
          </Link>
        </h2>
      ) : (
        <h2 className="text-[13px] font-semibold uppercase leading-none tracking-[0.1em] text-foreground">
          {title}
        </h2>
      )}
      {description ? (
        <p className="type-caption mt-2 max-w-2xl text-faint-foreground">
          {description}
        </p>
      ) : null}
      <div className="rule mt-4" aria-hidden="true" />
    </div>
  );
}
