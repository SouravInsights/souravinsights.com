"use client";

import type { Project } from "./projects-data";

/**
 * The fields a row does not show, for a new project or a promoted one.
 *
 * Styled to the same form language as the rest of the site (the gallery's
 * editor): rectangular, hairline border, transparent field, ring on focus.
 * The logo is a path to a file in `public/projects/`, like every other project
 * here — no upload, nothing to store.
 */
function Field({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const shared =
    "w-full rounded-lg border border-border bg-transparent text-sm text-foreground outline-none transition-colors placeholder:text-faint-foreground focus:border-input focus:ring-2 focus:ring-ring/30";
  return (
    <label className="block">
      <span className="type-label mb-1.5 block text-faint-foreground">
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          rows={3}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${shared} resize-y px-3 py-2 leading-relaxed`}
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${shared} h-9 px-3`}
        />
      )}
    </label>
  );
}

export function ProjectFields({
  project,
  onChange,
  onRemove,
}: {
  project: Project;
  onChange: (patch: Partial<Project>) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Slug"
          value={project.slug}
          placeholder="my-project"
          onChange={(value) => onChange({ slug: value })}
        />
        <Field
          label="Logo path"
          value={project.logo}
          placeholder="/projects/my-logo.png"
          onChange={(value) => onChange({ logo: value })}
        />
        <Field
          label="URL"
          value={project.url}
          placeholder="https://"
          onChange={(value) => onChange({ url: value })}
        />
        <Field
          label="Repo"
          value={project.repo ?? ""}
          placeholder="https://github.com/…"
          onChange={(value) => onChange({ repo: value })}
        />
      </div>

      <div className="mt-4 grid gap-4">
        <Field
          label="Home note"
          value={project.note}
          placeholder="One line for the home page"
          onChange={(value) => onChange({ note: value })}
        />
        <Field
          label="What it is"
          value={project.what}
          onChange={(value) => onChange({ what: value })}
          multiline
        />
        <Field
          label="Why"
          value={project.why}
          onChange={(value) => onChange({ why: value })}
          multiline
        />
      </div>

      {onRemove && (
        <div className="mt-4 flex justify-end border-t border-border pt-3">
          <button
            type="button"
            onClick={onRemove}
            className="type-caption font-medium text-destructive/60 transition-colors hover:text-destructive"
          >
            Remove project
          </button>
        </div>
      )}
    </div>
  );
}
