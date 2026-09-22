import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { SmallProject } from "./projects-data";
import { FadeIn } from "@/components/FadeIn";

/** Hostname only, without protocol or `www.`, to hint at the source. */
const shortDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/**
 * Smaller experiments and older side projects, shown inline so they read as a
 * quiet secondary list rather than something hidden behind a toggle.
 */
export function MoreProjects({ projects }: { projects: SmallProject[] }) {
  return (
    <div className="flex flex-col">
      {projects.map((project, index) => (
        <FadeIn key={project.name} delay={Math.min(index, 12) * 0.03}>
          {index > 0 && (
            <div className="rule my-5 sm:my-6" aria-hidden="true" />
          )}
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4"
          >
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
              <Image
                src={project.logo}
                alt={`${project.name} logo`}
                fill
                className="object-cover"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="type-heading block group-hover:text-green-700 dark:group-hover:text-green-500 transition-colors">
                {project.name}
              </span>
              <span className="type-caption block text-faint-foreground">
                {shortDomain(project.url)}
              </span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-green-700 dark:group-hover:text-green-500" />
          </a>
        </FadeIn>
      ))}
    </div>
  );
}