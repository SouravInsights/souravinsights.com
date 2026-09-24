/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, ChevronRight, Github } from "lucide-react";
import { featuredProjects, otherProjects } from "./projects-data";
import { MoreProjects } from "./MoreProjects";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { FadeIn } from "@/components/FadeIn";

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
      <div className="mx-auto max-w-5xl px-5 pb-24 pt-20 sm:px-6 sm:pt-24 md:pt-32">
        <FadeIn y={20} duration={0.5}>
          <PageHeader
            title="Projects"
            description="A few things I'm spending my time on lately."
          />
        </FadeIn>

        {/* Featured projects */}
        <div className="flex flex-col">
          {featuredProjects.map((project, index) => {
            const logoIsSvg = project.logo.endsWith(".svg");

            return (
              <FadeIn key={project.slug} delay={Math.min(index, 12) * 0.03}>
                {index > 0 && (
                  <div className="rule my-7 sm:my-8" aria-hidden="true" />
                )}
                <article id={project.slug} className="scroll-mt-24">
                  <div className="flex items-center gap-4">
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex min-w-0 flex-1 items-center gap-4 sm:gap-5"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary sm:h-16 sm:w-16">
                        <Image
                          src={project.logo}
                          alt={`${project.name} logo`}
                          fill
                          unoptimized={logoIsSvg}
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="type-title group-hover:text-green-700 dark:group-hover:text-green-500 transition-colors">
                          {project.name}
                        </h2>
                        <p className="type-body mt-0.5 text-muted-foreground">
                          {project.tagline}
                        </p>
                      </div>
                      <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-green-700 dark:group-hover:text-green-500" />
                    </a>
                    {project.repo && (
                      <a
                        href={project.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${project.name} on GitHub`}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Github className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </article>
              </FadeIn>
            );
          })}
        </div>

        {/* Smaller projects */}
        <section className="mt-16 sm:mt-24">
          <FadeIn>
            <SectionHeader
              title="Smaller things"
              description="Older experiments and side projects that didn't need more than a weekend."
            />
          </FadeIn>
          <MoreProjects projects={otherProjects} />
        </section>

        <FadeIn className="mt-16 sm:mt-24">
          <a
            href="https://github.com/SouravInsights"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 type-caption font-medium text-muted-foreground hover:text-green-700 dark:hover:text-green-500 transition-colors"
          >
            More on GitHub <ChevronRight className="w-4 h-4" />
          </a>
        </FadeIn>
      </div>
    </div>
  );
}