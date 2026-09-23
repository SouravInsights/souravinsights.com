"use client";

import { SectionHeader } from "@/components/SectionHeader";
import { FadeIn } from "@/components/FadeIn";
import { useSpotlight, spotlightClass } from "@/hooks/useSpotlight";

const OPINIONS = [
  "Curiousity & persistence can outmatch talent.",
  "Suffering is not always bad, comfort is not always good.",
  "The most dangerous thing about the internet isn’t distraction, it’s identity addiction!",
  "We romanticize 'busy' because we're scared of what we'd find in the silence",
  "You are replaceable. And that’s okay",
  "Sometimes you don’t miss the person. You miss the version of yourself who hoped things would turn out better.",
  "Most people are lonely not because they're alone, but because they're afraid to be vulnerable",
];

/**
 * Opinions read as one block, so focusing a line pushes every other line out of
 * focus. Hover previews it; clicking pins it (click again or the background to
 * release). Lives in its own component so the rest of the page never re-renders
 * on mouse move.
 */
export function OpinionsSection() {
  const { active, isDimmed, getItemProps, clear } = useSpotlight({
    pinnable: true,
  });

  return (
    <section>
      <FadeIn>
        <SectionHeader
          title="Unpopular Opinions"
          description="Things I've felt, noticed and often keep circling back to."
        />
      </FadeIn>
      <div className="flex flex-col gap-1" onClick={clear}>
        {OPINIONS.map((opinion, index) => {
          const isActive = active === index;

          return (
            <button
              key={index}
              type="button"
              {...getItemProps(index)}
              className={`flex cursor-pointer items-start gap-4 text-left ${spotlightClass(
                isDimmed(index)
              )}`}
            >
              <span
                className={`mt-1 w-6 shrink-0 font-mono text-[13px] font-medium tabular-nums text-green-700 transition-colors dark:text-green-500 ${
                  isActive ? "opacity-100" : "opacity-70"
                }`}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="type-body italic text-muted-foreground">
                {opinion}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
