import { HUES } from "@/lib/highlight-palette";

/**
 * The palette as the footer's rule.
 *
 * The header opens on the palette pill; the page closes on the same eight hues
 * stretched into a hairline, so the product's one bit of colour brackets the
 * whole document. Same source as the pill, so the two can never drift.
 */
export function PaletteRule() {
  return (
    <div className="foot-palette" aria-hidden="true">
      {HUES.map((hue) => (
        <span key={hue.name} style={{ background: hue.swatch }} />
      ))}
    </div>
  );
}
