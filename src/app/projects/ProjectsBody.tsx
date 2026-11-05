"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { FadeIn } from "@/components/FadeIn";
import { splitProjects, type Project } from "./projects-data";
import { ProjectRow } from "./ProjectRow";
import { ProjectSmallRow } from "./ProjectSmallRow";
import { ProjectsSkeleton } from "./ProjectsSkeleton";
import { useProjectsEditing } from "./ProjectsEditing";

// The editor, dnd-kit and all: a chunk only an admin who opens the mode loads.
const ProjectsEditor = dynamic(
  () => import("./ProjectsEditor").then((mod) => mod.ProjectsEditor),
  { ssr: false }
);

/**
 * The list, in one of its two states.
 *
 * View is the page as everyone sees it. Reorder swaps in the same skeleton and
 * the same rows, with drag handles — nothing around it moves.
 */
export function ProjectsBody({
  initialProjects,
}: {
  initialProjects: Project[];
}) {
  const { editing } = useProjectsEditing();
  const [projects, setProjects] = useState(initialProjects);
  const { featured, other, graveyard } = splitProjects(projects);

  // For whoever opens the console. The graveyard is at the bottom.
  useEffect(() => {
    const buried = graveyard.length;
    if (!buried) return;
    console.log(
      `%c†  ${buried} project${buried === 1 ? "" : "s"} in the graveyard. mind the ghosts.`,
      "color:#8C8278;font-style:italic;font-family:ui-serif,Georgia,serif"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (editing) {
    return <ProjectsEditor initialData={projects} onChange={setProjects} />;
  }

  return (
    <ProjectsSkeleton
      featuredItems={featured.map((project, index) => ({
        key: project.slug,
        node: (
          <FadeIn delay={Math.min(index, 12) * 0.03}>
            <ProjectRow project={project} />
          </FadeIn>
        ),
      }))}
      otherItems={other.map((project, index) => ({
        key: project.slug,
        node: (
          <FadeIn delay={Math.min(index, 12) * 0.03}>
            <ProjectSmallRow project={project} />
          </FadeIn>
        ),
      }))}
      graveyardItems={graveyard.map((project, index) => ({
        key: project.slug,
        node: (
          <FadeIn delay={Math.min(index, 12) * 0.03}>
            <ProjectSmallRow project={project} />
          </FadeIn>
        ),
      }))}
    />
  );
}
