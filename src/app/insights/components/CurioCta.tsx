import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/ssr";
import { Curio } from "@/components/curio/Curio";
import { CurioWordmark } from "@/components/curio/CurioWordmark";

/**
 * A one-line door to /curio, where the agent gets the whole screen.
 *
 * The insights page used to carry the full Ask panel. That made the page two
 * products stacked: a chat and a collection, each with its own entry point and
 * its own scroll. The collection is what this page is for, so the agent keeps a
 * footer here and moves its real estate to its own route.
 *
 * The entire banner is the link: one target, one action. The bot is `still`
 * because a CTA is not the place for two mascots tapping at once.
 */
export function CurioCta() {
  return (
    <Link
      href="/curio"
      className="group flex items-center gap-3 rounded-lg border border-border bg-foreground/[0.02] px-4 py-3 transition-colors hover:border-foreground/20 hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700/40 dark:focus-visible:ring-green-500/40"
    >
      <Curio size={34} still />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <CurioWordmark size="md" />
          <span className="type-caption hidden text-faint-foreground sm:inline">
            the agent for this collection
          </span>
        </span>
        <span className="type-caption mt-0.5 block text-muted-foreground">
          Ask anything about the links I&apos;ve saved. Answers cite their sources.
        </span>
      </span>

      <span className="inline-flex shrink-0 items-center gap-1 type-caption font-medium text-muted-foreground transition-colors group-hover:text-green-700 dark:group-hover:text-green-500">
        Ask
        <ArrowUpRight
          aria-hidden="true"
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </span>
    </Link>
  );
}
