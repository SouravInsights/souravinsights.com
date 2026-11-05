"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  CaretDown,
  GithubLogo,
  ImageSquare,
} from "@phosphor-icons/react";
import { EditableField } from "@/components/EditableField";
import type { Project } from "./projects-data";
import dynamic from "next/dynamic";

// Edit-only, so it is a separate chunk: a visitor never downloads it.
const ProjectFields = dynamic(
  () => import("./ProjectFields").then((mod) => mod.ProjectFields),
  { ssr: false }
);

/**
 * One row of the main list — the row the page shows, not a representation of it.
 *
 * `editable` swaps the trailing link for a drag handle and turns the name and
 * tagline into editable fields; nothing else about the row moves. That is the
 * whole point of the editor being WYSIWYG: it is this component, on this page,
 * with the drag layer switched on.
 */
export function ProjectRow({
  project,
  editable = false,
  onChange,
  onRemove,
  dragHandle,
}: {
  project: Project;
  editable?: boolean;
  onChange?: (patch: Partial<Project>) => void;
  onRemove?: () => void;
  dragHandle?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const patch = (next: Partial<Project>) => onChange?.(next);

  // A new project has no logo yet, and an empty src is a broken image.
  const logo = project.logo ? (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary sm:h-16 sm:w-16">
      <Image
        src={project.logo}
        alt={`${project.name} logo`}
        fill
        unoptimized={project.logo.endsWith(".svg")}
        className="object-cover"
      />
    </div>
  ) : (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-faint-foreground sm:h-16 sm:w-16">
      <ImageSquare className="h-5 w-5" />
    </div>
  );

  return (
    <article id={project.slug} className="scroll-mt-24">
      <div className="flex items-center gap-4">
        {editable ? (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
              {logo}
              <div className="min-w-0 flex-1">
                <EditableField
                  as="h2"
                  value={project.name}
                  onChange={(value) => patch({ name: value })}
                  isEditing
                  placeholder="Name"
                  className="type-title"
                />
                <EditableField
                  as="p"
                  value={project.tagline}
                  onChange={(value) => patch({ tagline: value })}
                  isEditing
                  placeholder="Tagline"
                  className="type-body mt-0.5 text-muted-foreground"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? "Hide fields" : "Edit fields"}
              title={open ? "Hide fields" : "Edit fields"}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <CaretDown
                className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
            {dragHandle}
          </>
        ) : (
          <>
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-w-0 flex-1 items-center gap-4 sm:gap-5"
            >
              {logo}
              <div className="min-w-0 flex-1">
                <h2 className="type-title transition-colors group-hover:text-green-700 dark:group-hover:text-green-500">
                  {project.name}
                </h2>
                {project.tagline && (
                  <p className="type-body mt-0.5 text-muted-foreground">
                    {project.tagline}
                  </p>
                )}
              </div>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-green-700 dark:group-hover:text-green-500" />
            </a>
            {project.repo && (
              <a
                href={project.repo}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${project.name} on GitHub`}
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              >
                <GithubLogo className="h-5 w-5" />
              </a>
            )}
          </>
        )}
      </div>

      {editable && open && (
        <div className="mt-4">
          <ProjectFields
            project={project}
            onChange={patch}
            onRemove={onRemove}
          />
        </div>
      )}
    </article>
  );
}
