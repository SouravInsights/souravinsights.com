interface SectionHeaderProps {
  title: string;
  description?: string;
}

/**
 * The heading used between sections inside a page. Matches PageHeader so a
 * section never reads louder or quieter than the page it sits on.
 */
export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-5">
      <h2 className="type-title">{title}</h2>
      {description ? (
        <p className="type-body mt-2 max-w-2xl text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}