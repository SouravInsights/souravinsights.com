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
      <div className="mx-auto max-w-5xl px-5 pb-24 pt-10 sm:px-6 sm:pt-12 md:pt-28 space-y-12 sm:space-y-16">
        <PageHeader
          title="Projects"
          description="A few things I'm spending my time on lately."
        />

        {/* Featured projects */}
        <div className="space-y-4">
          {featuredProjects.map((project) => {
            const logoIsSvg = project.logo.endsWith(".svg");

            return (
              <article
                key={project.slug}
                id={project.slug}
                className="card p-4 sm:p-5 scroll-mt-24"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
                  {/* Visual */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-secondary sm:h-16 sm:w-16">
                    <Image
                      src={project.logo}
                      alt={`${project.name} logo`}
                      fill
                      unoptimized={logoIsSvg}
                      className="object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="type-title">
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
                    <p className="type-body mt-2 text-foreground/80">
                      {project.tagline}
                    </p>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <div>
                        <h3 className="type-label">What it is</h3>
                        <p className="type-caption mt-2">{project.what}</p>
                      </div>
                      <div>
                        <h3 className="type-label">Why I'm working on it</h3>
                        <p className="type-caption mt-2">{project.why}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
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