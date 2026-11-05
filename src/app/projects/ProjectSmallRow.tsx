"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowUpRight, CaretDown, ImageSquare } from "@phosphor-icons/react";
import { EditableField } from "@/components/EditableField";
import type { Project } from "./projects-data";
import dynamic from "next/dynamic";

// Edit-only, so it is a separate chunk: a visitor never downloads it.
const ProjectFields = dynamic(
  () => import("./ProjectFields").then((mod) => mod.ProjectFields),
  { ssr: false }
);

/**
 * Host and path, without the protocol or `www.`.
 *
 * The path matters: Curio is not a domain of its own, it is a route on this
 * site, and "souravinsights.com" alone would tell the reader nothing about
 * where the link goes.
 */
const shortLabel = (url: string) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/$/, "");
    return `${host}${path}`;
  } catch {
    return "";
  }
};

/**
 * One row of the smaller list. Same contract as `ProjectRow`: the page's row,
 * with the drag handle swapped in when editing.
 */
export function ProjectSmallRow({
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
    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
      <Image
        src={project.logo}
        alt={`${project.name} logo`}
        fill
        unoptimized={project.logo.endsWith(".svg")}
        className="object-cover"
      />
    </span>
  ) : (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-faint-foreground">
      <ImageSquare className="h-4 w-4" />
    </span>
  );

  if (editable) {
    return (
      <div>
        {/* Scoped to the row, not the panel: the form should not hover. */}
        <div className="flex items-center gap-4 rounded-lg transition-colors hover:bg-foreground/[0.03]">
          {logo}
          <span className="min-w-0 flex-1">
            <EditableField
              as="span"
              value={project.name}
              onChange={(value) => patch({ name: value })}
              isEditing
              placeholder="Name"
              className="type-heading block"
            />
            <EditableField
              as="span"
              value={project.url}
              onChange={(value) => patch({ url: value })}
              isEditing
              placeholder="https://"
              className="type-caption block text-faint-foreground"
            />
          </span>
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
        </div>
        {open && (
          <div className="mt-4">
            <ProjectFields
              project={project}
              onChange={patch}
              onRemove={onRemove}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4"
    >
      {logo}
      <span className="min-w-0 flex-1">
        <span className="type-heading block transition-colors group-hover:text-green-700 dark:group-hover:text-green-500">
          {project.name}
        </span>
        <span className="type-caption block text-faint-foreground">
          {shortLabel(project.url)}
        </span>
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-green-700 dark:group-hover:text-green-500" />
    </a>
  );
}
