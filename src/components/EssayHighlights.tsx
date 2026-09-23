"use client";

import { format } from "date-fns";
import { FadeIn } from "@/components/FadeIn";
import { useSpotlight, spotlightClass } from "@/hooks/useSpotlight";
import { emphasisClass } from "@/lib/emphasis";

const formatDate = (date: string) =>
  format(new Date(`${date}T00:00:00`), "MMM d, yyyy");

const ESSAYS = [
  {
    title: "We are unconsciously becoming someone else",
    url: "/blog/on-becoming-someone-else",
    date: "2026-09-19",
  },
  {
    title: "An AI Workflow to Slow Down & Reflect in the Age of Inference-Speed",
    url: "/blog/learning-with-ai-agents",
    date: "2026-02-04",
  },
  {
    title: "On Designing Forms That Don't Get in the Way",
    url: "/blog/on-designing-forms",
    date: "2026-01-17",
  },
  {
    title: "Why Riding Feels So Liberating",
    url: "/blog/why-riding-is-like-a-therapy",
    date: "2025-09-30",
  },
  {
    title: 'The Endless Pursuit of "The Next New Thing"',
    url: "/blog/the-endless-pursuit-of-the-next-new-thing",
    date: "2025-09-20",
  },
  {
    title: "Building a Brain That Can Do Everything (But Not All at Once)",
    url: "/blog/polymath-mode",
    date: "2025-04-19",
  },
];

/**
 * The newest essays read loudest and recede with age (see `emphasisClass`),
 * while hovering any row blurs the rest so one can be read on its own.
 */
export function EssayHighlights() {
  const { isDimmed, getItemProps } = useSpotlight();

  return (
    <div className="flex flex-col">
      {ESSAYS.map((blog, index) => (
        <div key={blog.title}>
          {index > 0 && <div className="rule" aria-hidden="true" />}
          <FadeIn delay={Math.min(index, 12) * 0.03}>
            <a
              href={blog.url}
              {...getItemProps(index)}
              className={`list-row group min-h-[4.5rem] sm:items-center ${spotlightClass(
                isDimmed(index)
              )}`}
            >
              <h3
                className={`type-heading min-w-0 line-clamp-2 transition-colors group-hover:text-green-700 dark:group-hover:text-green-500 ${emphasisClass(
                  index
                )}`}
              >
                {blog.title}
              </h3>
              <time dateTime={blog.date} className="type-caption shrink-0">
                {formatDate(blog.date)}
              </time>
            </a>
          </FadeIn>
        </div>
      ))}
    </div>
  );
}
