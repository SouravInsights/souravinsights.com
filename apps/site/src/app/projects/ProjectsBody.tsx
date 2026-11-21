"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { FadeIn } from "@/components/FadeIn";
import { hasAdminHint } from "@/lib/admin-client";
import { splitProjects, type Project } from "./projects-data";
import { ProjectRow } from "./ProjectRow";
import { ProjectSmallRow } from "./ProjectSmallRow";
import { ProjectsSkeleton } from "./ProjectsSkeleton";

// The editor, dnd-kit and all: a chunk only an admin loads.
const ProjectsEditor = dynamic(
  () => import("./ProjectsEditor").then((mod) => mod.ProjectsEditor),
  { ssr: false }
);

/**
 * The list.
 *
 * There is no reorder mode. An admin gets the same page a visitor gets, with
 * drag handles and editable fields on the rows; a visitor gets the rows without
 * them. `admin_ui` is a non-secret hint, so the page still renders statically
 * and the editor — and dnd-kit — loads only for the owner.
 */
export function ProjectsBody({
  initialProjects,
}: {
  initialProjects: Project[];
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [projects, setProjects] = useState(initialProjects);
  const { featured, other, graveyard } = splitProjects(projects);

  useEffect(() => {
    setIsAdmin(hasAdminHint());
  }, []);

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

  if (isAdmin) {
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
