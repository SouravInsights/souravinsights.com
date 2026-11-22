import type { Mode } from "@/components/quote/presets";

export interface KeptLine {
  /** the sentence as it was written, quoted verbatim */
  quote: string;
  /** the post it came from */
  source: string;
  theme: string;
  mode: Mode;
}

/**
 * Lines from the posts, kept for the cards.
 *
 * The point of the section is the words, so the content varies: eight lines
 * from four posts, each set in a different design and format. A gallery of the
 * same sentence would only be showing the frame.
 */
export const KEPT_LINES: KeptLine[] = [
  {
    quote:
      "Most of these decisions are invisible when they are done right, but very noticeable when they are not.",
    source: "On Designing Forms",
    theme: "marker",
    mode: "post",
  },
  {
    quote: "It's not about growth. It's about thrill.",
    source: "The Next New Thing",
    theme: "ember",
    mode: "story",
  },
  {
    quote: "We confuse better with different.",
    source: "The Next New Thing",
    theme: "bold",
    mode: "square",
  },
  {
    quote: "We want to feel something about the way we achieved them.",
    source: "On Goals and Agency",
    theme: "mesh",
    mode: "post",
  },
  {
    quote: "You could call those two years wasted. Or you could say that I was steering.",
    source: "On Goals and Agency",
    theme: "ember",
    mode: "square",
  },
  {
    quote: "Authenticity now has to be certified.",
    source: "Unconsciously Someone Else",
    theme: "marker",
    mode: "story",
  },
  {
    quote: "We are losing our thinking capability.",
    source: "Unconsciously Someone Else",
    theme: "bold",
    mode: "post",
  },
  {
    quote: "We've gotten used to instant gratification.",
    source: "The Next New Thing",
    theme: "mesh",
    mode: "story",
  },
];
