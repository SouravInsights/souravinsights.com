interface PageHeaderProps {
  title: string;
  description?: string;
}

/**
 * The top-of-page heading used on every list page. Left-aligned and
 * separator-free so the title sits at the same height and rhythm everywhere.
 */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="type-display">{title}</h1>
      {description ? (
        <p className="type-body mt-3 max-w-2xl text-muted-foreground">
          {description}
        </p>
      ) : null}
    </header>
  );
}