import type { Metadata } from "next";
import { CaretRight } from "@phosphor-icons/react/ssr";
import { getProjectsData } from "./queries";
import { ProjectsBody } from "./ProjectsBody";
import { PageHeader } from "@/components/PageHeader";
import { FadeIn } from "@/components/FadeIn";

const DESCRIPTION = "A few things I'm spending my time on lately.";

export const metadata: Metadata = {
  title: "Projects | SouravInsights",
  description: DESCRIPTION,
  openGraph: {
    title: "Projects | SouravInsights",
    description: DESCRIPTION,
    type: "website",
    url: "https://www.souravinsights.com/projects",
  },
};

export default async function ProjectsPage() {
  const projects = await getProjectsData();

  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      <div className="mx-auto max-w-5xl px-5 pb-10 pt-6 sm:px-6 sm:pt-8">
        <FadeIn y={20} duration={0.3}>
          <PageHeader title="Projects" description={DESCRIPTION} />
        </FadeIn>

        {/* One list for everyone. An admin's rows carry drag handles and
            editable fields; a visitor's do not. */}
        <ProjectsBody initialProjects={projects} />

        <FadeIn className="mt-10 sm:mt-14">
          <a
            href="https://github.com/SouravInsights"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 type-caption font-medium text-muted-foreground transition-colors hover:text-green-700 dark:hover:text-green-500"
          >
            More on GitHub <CaretRight className="w-4 h-4" />
          </a>
        </FadeIn>
      </div>
    </div>
  );
}
