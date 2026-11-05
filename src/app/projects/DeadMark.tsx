/**
 * The dagger.
 *
 * The mark a printed page has used for the dead for centuries, and still uses
 * in a footnote. Deliberately not a badge: a dead project should read as a small
 * edit in the margin of the live ones, not as a second thing competing with
 * them. The logo dims alongside it (see the rows), so the decay is visible
 * before the reader reaches the mark.
 */
export function DeadMark() {
  return (
    <span
      title="No longer maintained"
      aria-label="No longer maintained"
      className="ml-2 inline-block text-[1.15em] leading-none font-normal text-muted-foreground align-[-0.08em]"
    >
      †
    </span>
  );
}

/**
 * A small, stable lean per headstone.
 *
 * Real cemeteries are full of stones that have settled at their own angle, and a
 * row of perfectly upright ones reads as a list of icons, not graves. Derived
 * from the slug so a stone never moves between renders.
 */
export function graveTilt(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return (hash % 5) - 2; // -2deg .. +2deg
}
