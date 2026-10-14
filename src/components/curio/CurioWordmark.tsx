/**
 * The Curio wordmark.
 *
 * The typography is the mark: no badges, no coloured dots, nothing stuck on the
 * word. What makes a name read as a logo rather than as text is weight, tracking
 * and size discipline, and this is a first pass at that. The numbers are being
 * chosen by rendering candidates and looking at them, not by guessing.
 *
 * What this replaced, and why. The first version was `type-label`: 11px,
 * uppercase, 0.14em tracking, which is a caption style, so "CURIO" read like a
 * field label. The second was the site's mono, sentence case, to match the
 * rail's "Sourav"; rendered beside the mascot it read as code, because mono
 * reads as code. Both were set in the wrong voice for a name.
 *
 * Two other candidates were tried and rejected on sight: the final "o" replaced
 * by the mascot's face (a green rounded square with two eyes), which is a smudge
 * at 13px and ambiguous at 18px, and lowercase mono, which reads as a handle.
 *
 * Kept as a component so the same word appears the same way wherever Curio signs
 * something. The OG card mirrors these numbers in Satori, which cannot read
 * Tailwind classes.
 */
const SIZES = {
  sm: 14,
  md: 17,
  lg: 20,
} as const;

/** The wordmark's own family, with a sane fallback if the variable is missing. */
const FAMILY = "var(--font-wordmark), Inter, system-ui, sans-serif";

export function CurioWordmark({
  size = "md",
  className = "text-foreground",
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={`font-bold leading-none tracking-[-0.02em] ${className}`}
      style={{ fontSize: SIZES[size], fontFamily: FAMILY }}
    >
      Curio
    </span>
  );
}
