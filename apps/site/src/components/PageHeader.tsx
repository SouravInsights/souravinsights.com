import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional control rendered beside the title, e.g. a view toggle. */
  action?: ReactNode;
}

/**
 * The top-of-page heading used on every list page. Left-aligned and
 * separator-free so the title sits at the same height and rhythm everywhere.
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex items-center justify-between gap-6">
        <h1 className="type-display">{title}</h1>
        {action}
      </div>
      {description ? (
        <p className="type-body mt-3 max-w-2xl text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className="rule mt-5" aria-hidden="true" />
    </header>
  );
}