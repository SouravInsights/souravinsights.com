/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, ChevronRight, Github } from "lucide-react";
import { featuredProjects, otherProjects } from "./projects-data";
import { MoreProjects } from "./MoreProjects";

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
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-12 transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-12 pt-16">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Projects
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A few things I'm spending my time on lately.
          </p>
        </header>

        {/* Featured projects */}
        <div className="space-y-6">
          {featuredProjects.map((project) => {
            const logoIsSvg = project.logo.endsWith(".svg");

            return (
              <article
                key={project.slug}
                id={project.slug}
                className="border border-border rounded-lg p-5 sm:p-7 md:p-8 scroll-mt-24"
              >
                <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                  {/* Visual */}
                  <div className="md:w-44 shrink-0">
                    <div className="relative w-20 h-20 md:w-32 md:h-32 rounded-2xl overflow-hidden border border-border bg-secondary">
                      <Image
                        src={project.logo}
                        alt={`${project.name} logo`}
                        fill
                        unoptimized={logoIsSvg}
                        className="object-cover"
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl md:text-2xl font-bold text-foreground">
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/title inline-flex items-center gap-2 transition-colors hover:text-green-600 dark:hover:text-green-500"
                        >
                          {project.name}
                          <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground transition-all duration-200 group-hover/title:-translate-y-0.5 group-hover/title:translate-x-0.5 group-hover/title:text-green-600 dark:group-hover/title:text-green-500" />
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
                    <p className="mt-2 text-foreground/80 leading-relaxed">
                      {project.tagline}
                    </p>

                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <div>
                        <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          What it is
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                          {project.what}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Why I'm working on it
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                          {project.why}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Progressively disclosed smaller projects */}
        <section className="border border-border rounded-lg p-5 sm:p-6 md:p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              Smaller things
            </h2>
            <p className="mt-2 text-muted-foreground">
              Older experiments and side projects that didn't need more than a
              weekend.
            </p>
          </div>
          <MoreProjects projects={otherProjects} />
        </section>

        <div className="text-center pb-4">
          <a
            href="https://github.com/SouravInsights"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-green-600 dark:hover:text-green-500 font-medium transition-colors"
          >
            More on GitHub <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}