"use client";

import { useEffect, useRef, useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import { Check, CircleNotch, DotsSixVertical, Plus } from "@phosphor-icons/react";
import { apiJson } from "@/lib/query/api";
import type { Project, ProjectSection } from "./projects-data";
import { ProjectRow } from "./ProjectRow";
import { ProjectSmallRow } from "./ProjectSmallRow";
import { ProjectsSkeleton } from "./ProjectsSkeleton";

/**
 * The reorder mode.
 *
 * It is the page's own skeleton with the page's own rows — nothing else. No
 * overlay, no second header, no board: switching this on is the only difference
 * between this and the page a visitor sees. Loaded with `next/dynamic` from
 * `ProjectsBody`, so dnd-kit is only downloaded by an admin who opens it.
 */

type AdminProject = Project & { id: string };
type Columns = Record<ProjectSection, AdminProject[]>;

const SECTIONS: ProjectSection[] = ["featured", "other"];

function toColumns(projects: Project[]): Columns {
  const pick = (section: ProjectSection) =>
    projects
      .filter((project) => project.section === section)
      .sort((a, b) => a.position - b.position)
      .map((project) => ({ ...project, id: project.slug }));
  return { featured: pick("featured"), other: pick("other") };
}

function toProjects(columns: Columns): Project[] {
  const flatten = (list: AdminProject[], section: ProjectSection): Project[] =>
    list.map(({ id, ...project }, position) => {
      void id;
      return { ...project, section, position };
    });
  return [
    ...flatten(columns.featured, "featured"),
    ...flatten(columns.other, "other"),
  ];
}

function SortableRow({
  project,
  index,
  section,
  onChange,
  onRemove,
}: {
  project: AdminProject;
  index: number;
  section: ProjectSection;
  onChange: (id: string, patch: Partial<Project>) => void;
  onRemove: (id: string) => void;
}) {
  const sortable = useSortable({ id: project.id, index, group: section });
  const Row = section === "featured" ? ProjectRow : ProjectSmallRow;

  const dragHandle = (
    <button
      ref={sortable.handleRef}
      type="button"
      aria-label={`Drag ${project.name} to reorder`}
      title="Drag to reorder"
      className="flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground active:cursor-grabbing"
    >
      <DotsSixVertical className="h-4 w-4" />
    </button>
  );

  return (
    <div
      ref={sortable.ref}
      data-dragging={sortable.isDragging || undefined}
      className="rounded-lg transition-colors hover:bg-foreground/[0.03] data-[dragging]:opacity-40 data-[dragging]:hover:bg-transparent"
    >
      <Row
        project={project}
        editable
        onChange={(patch) => onChange(project.id, patch)}
        onRemove={() => onRemove(project.id)}
        dragHandle={dragHandle}
      />
    </div>
  );
}

export function ProjectsEditor({
  initialData,
  onChange,
}: {
  initialData: Project[];
  onChange: (projects: Project[]) => void;
}) {
  const [columns, setColumns] = useState<Columns>(() => toColumns(initialData));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const next = toProjects(columns);
    onChange(next);
    setStatus("saving");

    const timer = setTimeout(async () => {
      try {
        await apiJson("/api/projects", {
          method: "PUT",
          body: JSON.stringify({ projects: next }),
        });
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("idle");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [columns, onChange]);

  const updateProject = (id: string, patch: Partial<Project>) => {
    setColumns((current) => {
      const next = { ...current };
      for (const section of SECTIONS) {
        next[section] = current[section].map((project) =>
          project.id === id ? { ...project, ...patch } : project
        );
      }
      return next;
    });
  };

  const addProject = (section: ProjectSection) => {
    setColumns((current) => ({
      ...current,
      [section]: [
        ...current[section],
        {
          id: crypto.randomUUID(),
          slug: `project-${Math.random().toString(36).slice(2, 7)}`,
          name: "New project",
          logo: "",
          url: "",
          tagline: "",
          note: "",
          what: "",
          why: "",
          section,
          position: current[section].length,
        },
      ],
    }));
  };

  const removeProject = (id: string) => {
    setColumns((current) => {
      const next = { ...current };
      for (const section of SECTIONS) {
        next[section] = current[section].filter((project) => project.id !== id);
      }
      return next;
    });
  };

  const addButton = (section: ProjectSection) => (
    <button
      type="button"
      onClick={() => addProject(section)}
      className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2.5 type-caption font-medium text-faint-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
    >
      <Plus className="h-3.5 w-3.5" />
      Add project
    </button>
  );

  return (
    <>
      {/* The mode explains itself once it is on: a visitor never sees it, and
          the two things you can do are not obvious from a handle alone. */}
      <p className="mb-6 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2 type-caption text-muted-foreground">
        <span className="font-medium text-foreground">Reorder mode. </span>
        Drag the handle to move a project, or drop it into the other list to
        switch between Main and Smaller things. Changes save on their own.
      </p>

      <DragDropProvider
        onDragOver={(event) => setColumns((current) => move(current, event))}
      >
        <ProjectsSkeleton
          featuredItems={columns.featured.map((project, index) => ({
            key: project.id,
            node: (
              <SortableRow
                project={project}
                index={index}
                section="featured"
                onChange={updateProject}
                onRemove={removeProject}
              />
            ),
          }))}
          otherItems={columns.other.map((project, index) => ({
            key: project.id,
            node: (
              <SortableRow
                project={project}
                index={index}
                section="other"
                onChange={updateProject}
                onRemove={removeProject}
              />
            ),
          }))}
          featuredFooter={addButton("featured")}
          otherFooter={addButton("other")}
        />
      </DragDropProvider>

      {status !== "idle" && (
        <div className="fixed bottom-[calc(var(--tabbar-space,0px)+1.5rem)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-1.5 shadow-[0_0_15px_rgba(0,0,0,0.1)] backdrop-blur-md">
          {status === "saving" ? (
            <>
              <CircleNotch className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                Saving…
              </span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 text-green-700 dark:text-green-500" />
              <span className="text-xs font-medium text-green-700 dark:text-green-500">
                Saved
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}
