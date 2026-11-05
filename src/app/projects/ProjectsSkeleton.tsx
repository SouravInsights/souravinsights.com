import { Fragment, type ReactNode } from "react";
import { SectionHeader } from "@/components/SectionHeader";

/** A row plus its stable key, so reordering never remounts a neighbour. */
export type SkeletonItem = { key: string; node: ReactNode };

/**
 * The projects page layout: the main list, then the "Smaller things" band.
 *
 * It takes rendered rows, not projects, so the viewer and the editor hand it the
 * *same* structure. The only difference between the two is which row component
 * goes in — the page's row, or the page's row with a drag handle.
 *
 * Rows are keyed by the caller's key (the slug), never by index: an index key
 * makes React tear down and rebuild a row when it moves, and a drag is a move.
 */
export function ProjectsSkeleton({
  featuredItems,
  otherItems,
  featuredFooter,
  otherFooter,
}: {
  featuredItems: SkeletonItem[];
  otherItems: SkeletonItem[];
  /** Optional trailing action, e.g. the editor's "Add project". */
  featuredFooter?: ReactNode;
  otherFooter?: ReactNode;
}) {
  return (
    <>
      <div className="flex flex-col">
        {featuredItems.map((item, index) => (
          <Fragment key={item.key}>
            {index > 0 && (
              <div className="rule my-7 sm:my-8" aria-hidden="true" />
            )}
            {item.node}
          </Fragment>
        ))}
        {featuredFooter}
      </div>

      <section className="mt-16 sm:mt-24">
        <SectionHeader
          title="Smaller things"
          description="Older experiments and side projects that didn't need more than a weekend."
        />
        <div className="flex flex-col">
          {otherItems.map((item, index) => (
            <Fragment key={item.key}>
              {index > 0 && (
                <div className="rule my-5 sm:my-6" aria-hidden="true" />
              )}
              {item.node}
            </Fragment>
          ))}
          {otherFooter}
        </div>
      </section>
    </>
  );
}
