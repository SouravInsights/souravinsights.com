import { HUES } from "@/lib/highlight-palette";

/**
 * The palette itself, as the page's mark. A fragment of the product's own
 * chrome at the top of the page, like a toolbar on a blank document — not a
 * logo, not a hero illustration.
 */
export function PalettePill() {
  return (
    <div className="palette-pill" aria-hidden="true">
      {HUES.map((hue) => (
        <span key={hue.name} style={{ background: hue.swatch }} />
      ))}
    </div>
  );
}
