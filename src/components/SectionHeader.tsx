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
    <div className="mb-8">
      <h2 className="text-[13px] font-semibold uppercase leading-none tracking-[0.1em] text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="type-caption mt-2 max-w-2xl text-faint-foreground">
          {description}
        </p>
      ) : null}
      <div className="rule mt-4" aria-hidden="true" />
    </div>
  );
}