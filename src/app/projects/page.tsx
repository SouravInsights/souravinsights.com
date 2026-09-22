/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, ChevronRight, Github } from "lucide-react";
import { featuredProjects, otherProjects } from "./projects-data";
import { MoreProjects } from "./MoreProjects";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";

export const metadata: Metadata = {
  title: "Projects | SouravInsights",
  description: "A few things I'm spending my time on lately.",
  openGraph: {
    title: "Projects | SouravInsights",
    description: "A few things I'm spending my time on lately.",
    type: "website",
    url: "https://www.souravinsights.com/projects",
  },
};

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      <div className="mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-6 sm:pt-12 md:pt-28 space-y-16 sm:space-y-24">
        <PageHeader
          title="Projects"
          description="A few things I'm spending my time on lately."
        />

        {/* Featured projects */}
        <div className="flex flex-col">
          {featuredProjects.map((project, index) => {
            const logoIsSvg = project.logo.endsWith(".svg");

            return (
              <div key={project.slug}>
                {index > 0 && (
                  <div className="rule my-10 sm:my-12" aria-hidden="true" />
                )}
                <article id={project.slug} className="scroll-mt-24">
                  <div className="flex items-center gap-3">
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-secondary">
                      <Image
                        src={project.logo}
                        alt={`${project.name} logo`}
                        fill
                        unoptimized={logoIsSvg}
                        className="object-cover"
                      />
                    </div>
                    <h2 className="type-heading">
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/title inline-flex items-center gap-2 transition-colors hover:text-green-600 dark:hover:text-green-500"
                      >
                        {project.name}
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-hover/title:-translate-y-0.5 group-hover/title:translate-x-0.5 group-hover/title:text-green-600 dark:group-hover/title:text-green-500" />
                      </a>
                    </h2>
                    {project.repo && (
                      <a
                        href={project.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${project.name} on GitHub`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <p className="type-body mt-2 max-w-2xl text-muted-foreground">
                    {project.tagline}
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <h3 className="type-label">What it is</h3>
                      <p className="type-caption mt-1.5">{project.what}</p>
                    </div>
                    <div>
                      <h3 className="type-label">Why I'm working on it</h3>
                      <p className="type-caption mt-1.5">{project.why}</p>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>

        {/* Progressively disclosed smaller projects */}
        <section>
          <SectionHeader
            title="Smaller things"
            description="Older experiments and side projects that didn't need more than a weekend."
          />
          <MoreProjects projects={otherProjects} />
        </section>

        <div>
          <a
            href="https://github.com/SouravInsights"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 type-caption font-medium text-muted-foreground hover:text-green-600 dark:hover:text-green-500 transition-colors"
          >
            More on GitHub <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}