"use client";

import React, { useState } from "react";
import { CVData } from "@/types/cv";
import { EditableField } from "@/components/EditableField";
import { saveCVData, loginAdmin } from "./actions";
import { cn } from "@/lib/utils";
import { Download, Check, Loader2, Eye, Edit2, Link as LinkIcon, Image as ImageIcon } from "lucide-react";

interface CVEditorProps {
  initialData: CVData;
  isEditing: boolean;
  secretToLogin?: string;
}

/* ------------------------------------------------------------------ *
 * Presentation helpers. Module scope on purpose: every entry in every
 * section renders through the same components, so spacing and the type
 * scale cannot drift between Experience, Projects and Education.
 * ------------------------------------------------------------------ */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const META = "text-[13px] leading-[1.5] text-muted-foreground";

function withProtocol(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

/**
 * Company and project logos default to the site's favicon, the same way the
 * safetomerge landing page resolves favicons. An explicit logoUrl always wins.
 */
function faviconFor(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const hostname = new URL(withProtocol(url)).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
  } catch {
    return undefined;
  }
}

function yearOf(value: string): number | undefined {
  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}

/**
 * A section only shows a span when it actually holds dates. Skills and the
 * summary have none, so they get no span rather than a decorative one.
 */
function spanOf(items: Array<{ startDate: string; endDate: string }>): string | undefined {
  const years = items
    .flatMap((item) => [yearOf(item.startDate), yearOf(item.endDate)])
    .filter((year): year is number => typeof year === "number");
  if (years.length === 0) return undefined;
  const ongoing = items.some((item) => /present/i.test(item.endDate));
  return `${Math.min(...years)} - ${ongoing ? "Present" : Math.max(...years)}`;
}

function Logo({
  imgUrl,
  linkUrl,
  isEditing,
}: {
  imgUrl?: string;
  linkUrl?: string;
  isEditing: boolean;
}) {
  const resolved = imgUrl || faviconFor(linkUrl);
  const href = linkUrl ? withProtocol(linkUrl) : undefined;

  const tile = cn(
    "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg",
    "bg-muted/60 ring-1 ring-inset ring-border/60",
    "transition-[background-color,box-shadow] duration-200",
    "group-hover/entry:bg-muted group-hover/entry:ring-border",
    FOCUS_RING
  );

  const mark = resolved ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolved} alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
  ) : isEditing ? (
    <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
  ) : null;

  if (!isEditing && href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={tile}>
        {mark}
      </a>
    );
  }
  return <div className={tile}>{mark}</div>;
}

function Dates({
  value,
  onChange,
  isEditing,
}: {
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
}) {
  return (
    <EditableField
      value={value}
      onChange={onChange}
      isEditing={isEditing}
      className={cn(META, "font-mono tabular-nums whitespace-nowrap")}
    />
  );
}

function Bullets({
  items,
  onChange,
  onAdd,
  isEditing,
}: {
  items: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  isEditing: boolean;
}) {
  return (
    <div className="mt-3 space-y-2.5">
      {items.map((bullet, index) => (
        <div key={index} className="relative pl-4">
          <span
            aria-hidden="true"
            className="absolute left-0 top-[0.62em] h-[5px] w-[5px] rounded-full bg-muted-foreground/40"
          />
          <EditableField
            as="div"
            value={bullet}
            onChange={(value) => onChange(index, value)}
            isEditing={isEditing}
            multiline
            className="text-[15px] leading-[1.65] text-foreground"
          />
        </div>
      ))}

      {isEditing && (
        <div className="pl-4">
          <button
            onClick={onAdd}
            className={cn(
              "rounded text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground",
              FOCUS_RING
            )}
          >
            + Add bullet
          </button>
        </div>
      )}
    </div>
  );
}

function SectionHead({ title, span }: { title: string; span?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
      <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
      {span && <span className={cn(META, "font-mono tabular-nums")}>{span}</span>}
    </div>
  );
}

function AddSectionButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded text-[13px] font-medium text-primary transition-opacity hover:opacity-70",
        FOCUS_RING
      )}
    >
      {children}
    </button>
  );
}

export function CVEditor({ initialData, isEditing: isUserAuthenticated, secretToLogin }: CVEditorProps) {
  const [data, setData] = useState<CVData>(initialData);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Derived state: edit controls only show for an authenticated user who is not previewing
  const isEditing = isUserAuthenticated && !isPreviewMode;

  // Track the first mount so we don't auto-save the initial data immediately
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (secretToLogin) {
      loginAdmin(secretToLogin);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [secretToLogin]);

  // Auto-save logic
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!isEditing) return;

    setSaveStatus("saving");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const res = await saveCVData(data);
      if (!res.success) {
        alert("Failed to save: " + res.error);
        setSaveStatus("idle");
      } else {
        setSaveStatus("saved");
        // Revert back to idle after a few seconds
        setTimeout(() => setSaveStatus("idle"), 2500);
      }
    }, 1500); // 1.5s debounce

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [data, isEditing]);

  const updateHeader = (key: keyof CVData["header"], value: string) => {
    setData((prev) => ({ ...prev, header: { ...prev.header, [key]: value } }));
  };

  /* Nested list updates. Each helper clones the entry it touches so React sees a
     new object, and the save effect fires once per edit. */
  const mutateAt = <K extends "workExperience" | "projects" | "education" | "skills">(
    key: K,
    index: number,
    mutate: (item: CVData[K][number]) => void
  ) => {
    setData((prev) => {
      const next = [...prev[key]] as CVData[K];
      next[index] = { ...next[index] };
      mutate(next[index]);
      return { ...prev, [key]: next };
    });
  };

  const linkClass =
    "underline decoration-border decoration-1 underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-foreground";

  return (
    <div className="relative min-h-screen bg-background px-5 pb-16 pt-28 text-foreground antialiased selection:bg-primary/20 sm:pb-24 sm:pt-36">
      {/* Floating preview toggle for the authenticated user */}
      {isUserAuthenticated && (
        <button
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className={cn(
            "fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full",
            "border border-border/60 bg-background/80 text-muted-foreground backdrop-blur-md",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.16)]",
            "transition-[background-color,color,transform] duration-200",
            "hover:bg-muted hover:text-foreground active:scale-95 motion-reduce:active:scale-100",
            FOCUS_RING
          )}
          title={isPreviewMode ? "Back to edit mode" : "Preview mode"}
        >
          {isPreviewMode ? <Edit2 className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}

      {/* Auto-save status */}
      {isEditing && saveStatus !== "idle" && (
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full",
            "border border-border/60 bg-background/80 px-3 py-1.5 backdrop-blur-md",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.16)]"
          )}
        >
          {saveStatus === "saving" && (
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
        </div>
      )}

      <div className="mx-auto max-w-[760px]">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <EditableField
              as="h1"
              value={data.header.name}
              onChange={(val) => updateHeader("name", val)}
              isEditing={isEditing}
              className="text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-[44px]"
            />

            <div className="mt-4 space-y-1.5">
              <div className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1", META)}>
                <EditableField
                  value={data.header.location}
                  onChange={(val) => updateHeader("location", val)}
                  isEditing={isEditing}
                />
                <span className="text-muted-foreground/30">·</span>
                <EditableField
                  value={data.header.phone}
                  onChange={(val) => updateHeader("phone", val)}
                  isEditing={isEditing}
                />
                <span className="text-muted-foreground/30">·</span>
                <EditableField
                  value={data.header.email}
                  onChange={(val) => updateHeader("email", val)}
                  isEditing={isEditing}
                  href={`mailto:${data.header.email}`}
                  className={linkClass}
                />
              </div>

              <div className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1", META)}>
                <EditableField
                  value={data.header.website}
                  onChange={(val) => updateHeader("website", val)}
                  isEditing={isEditing}
                  href={withProtocol(data.header.website)}
                  className={linkClass}
                />
                <span className="text-muted-foreground/30">·</span>
                <EditableField
                  value={data.header.linkedin}
                  onChange={(val) => updateHeader("linkedin", val)}
                  isEditing={isEditing}
                  href={withProtocol(data.header.linkedin)}
                  className={linkClass}
                />
                <span className="text-muted-foreground/30">·</span>
                <EditableField
                  value={data.header.twitter}
                  onChange={(val) => updateHeader("twitter", val)}
                  isEditing={isEditing}
                  href={withProtocol(data.header.twitter)}
                  className={linkClass}
                />
              </div>
            </div>
          </div>

          <a
            href="/cv/pdf"
            className={cn(
              "group inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-lg px-3.5",
              "bg-primary text-[13px] font-medium text-primary-foreground",
              "shadow-[0_1px_2px_rgba(0,0,0,0.06),0_6px_16px_-6px_rgba(0,0,0,0.28)]",
              "transition-[transform,box-shadow,opacity] duration-200",
              "hover:opacity-90 active:scale-[0.98] motion-reduce:active:scale-100",
              FOCUS_RING
            )}
          >
            <Download className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-y-[1px]" />
            Download PDF
          </a>
        </header>

        {/* About */}
        <section className="mt-14 sm:mt-16">
          <SectionHead title="About" />
          <p className="mt-5 text-[15px] leading-[1.7] text-foreground">
            <EditableField
              as="span"
              value={data.about}
              onChange={(val) => setData((prev) => ({ ...prev, about: val }))}
              isEditing={isEditing}
              multiline
            />
          </p>
        </section>

        {/* Experience */}
        <section className="mt-14 sm:mt-16">
          <SectionHead title="Experience" span={spanOf(data.workExperience)} />

          <div className="mt-8 space-y-10">
            {data.workExperience.map((job, index) => {
              const showLogo = Boolean(job.logoUrl || job.companyUrl) || isEditing;

              return (
                <div
                  key={job.id}
                  className={cn(
                    "group/entry grid gap-x-5",
                    showLogo ? "grid-cols-[40px_1fr]" : "grid-cols-1"
                  )}
                >
                  {showLogo && (
                    <Logo imgUrl={job.logoUrl} linkUrl={job.companyUrl} isEditing={isEditing} />
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <EditableField
                        value={job.role}
                        onChange={(val) => mutateAt("workExperience", index, (item) => { item.role = val; })}
                        isEditing={isEditing}
                        className="text-[15px] font-semibold text-foreground"
                      />
                      <Dates
                        value={`${job.startDate} - ${job.endDate}`}
                        onChange={(val) => {
                          const parts = val.split(" - ");
                          if (parts.length !== 2) return;
                          mutateAt("workExperience", index, (item) => {
                            item.startDate = parts[0].trim();
                            item.endDate = parts[1].trim();
                          });
                        }}
                        isEditing={isEditing}
                      />
                    </div>

                    <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <EditableField
                        value={job.company}
                        onChange={(val) => mutateAt("workExperience", index, (item) => { item.company = val; })}
                        isEditing={isEditing}
                        href={job.companyUrl ? withProtocol(job.companyUrl) : undefined}
                        className={cn("text-[15px] text-foreground", job.companyUrl && linkClass)}
                      />
                      {job.location && (
                        <>
                          <span className="text-muted-foreground/30">·</span>
                          <EditableField
                            value={job.location}
                            onChange={(val) => mutateAt("workExperience", index, (item) => { item.location = val; })}
                            isEditing={isEditing}
                            className={META}
                          />
                        </>
                      )}
                    </div>

                    {isEditing && (
                      <div className="flex items-center gap-4 pt-2 opacity-40 transition-opacity focus-within:opacity-100">
                        <EditMetaInput
                          icon={<ImageIcon className="h-3 w-3 text-muted-foreground" />}
                          value={job.logoUrl || ""}
                          placeholder="Paste logo URL..."
                          onChange={(val) => mutateAt("workExperience", index, (item) => { item.logoUrl = val; })}
                        />
                        <EditMetaInput
                          icon={<LinkIcon className="h-3 w-3 text-muted-foreground" />}
                          value={job.companyUrl || ""}
                          placeholder="Paste company URL..."
                          onChange={(val) => mutateAt("workExperience", index, (item) => { item.companyUrl = val; })}
                        />
                      </div>
                    )}

                    <Bullets
                      items={job.bullets}
                      onChange={(bulletIndex, val) =>
                        mutateAt("workExperience", index, (item) => { item.bullets[bulletIndex] = val; })
                      }
                      onAdd={() =>
                        mutateAt("workExperience", index, (item) => { item.bullets.push("New detail..."); })
                      }
                      isEditing={isEditing}
                    />
                  </div>
                </div>
              );
            })}

            {isEditing && (
              <AddSectionButton
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    workExperience: [
                      ...prev.workExperience,
                      {
                        id: Math.random().toString(),
                        startDate: "2024",
                        endDate: "Present",
                        role: "New Role",
                        company: "Company",
                        location: "Location",
                        bullets: ["Detail your work here"],
                      },
                    ],
                  }))
                }
              >
                + Add experience
              </AddSectionButton>
            )}
          </div>
        </section>

        {/* Independent projects */}
        <section className="mt-14 sm:mt-16">
          <SectionHead title="Independent projects" span={spanOf(data.projects)} />

          <div className="mt-8 space-y-10">
            {data.projects.map((project, index) => {
              const showLogo = Boolean(project.logoUrl || project.projectUrl) || isEditing;

              return (
                <div
                  key={project.id}
                  className={cn(
                    "group/entry grid gap-x-5",
                    showLogo ? "grid-cols-[40px_1fr]" : "grid-cols-1"
                  )}
                >
                  {showLogo && (
                    <Logo
                      imgUrl={project.logoUrl}
                      linkUrl={project.projectUrl}
                      isEditing={isEditing}
                    />
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                      <EditableField
                        value={project.name}
                        onChange={(val) => mutateAt("projects", index, (item) => { item.name = val; })}
                        isEditing={isEditing}
                        href={project.projectUrl ? withProtocol(project.projectUrl) : undefined}
                        className={cn("text-[15px] font-semibold text-foreground", project.projectUrl && linkClass)}
                      />
                      <Dates
                        value={`${project.startDate} - ${project.endDate}`}
                        onChange={(val) => {
                          const parts = val.split(" - ");
                          if (parts.length !== 2) return;
                          mutateAt("projects", index, (item) => {
                            item.startDate = parts[0].trim();
                            item.endDate = parts[1].trim();
                          });
                        }}
                        isEditing={isEditing}
                      />
                    </div>

                    <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <EditableField
                        value={project.role}
                        onChange={(val) => mutateAt("projects", index, (item) => { item.role = val; })}
                        isEditing={isEditing}
                        className={META}
                      />
                      {project.links && project.links.length > 0 && (
                        <>
                          {project.links.map((link) => (
                            <React.Fragment key={link.url}>
                              <span className="text-muted-foreground/30">·</span>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(META, linkClass)}
                              >
                                {link.label}
                              </a>
                            </React.Fragment>
                          ))}
                        </>
                      )}
                    </div>

                    {isEditing && (
                      <div className="flex items-center gap-4 pt-2 opacity-40 transition-opacity focus-within:opacity-100">
                        <EditMetaInput
                          icon={<ImageIcon className="h-3 w-3 text-muted-foreground" />}
                          value={project.logoUrl || ""}
                          placeholder="Paste logo URL..."
                          onChange={(val) => mutateAt("projects", index, (item) => { item.logoUrl = val; })}
                        />
                        <EditMetaInput
                          icon={<LinkIcon className="h-3 w-3 text-muted-foreground" />}
                          value={project.projectUrl || ""}
                          placeholder="Paste project URL..."
                          onChange={(val) => mutateAt("projects", index, (item) => { item.projectUrl = val; })}
                        />
                      </div>
                    )}

                    <Bullets
                      items={project.bullets}
                      onChange={(bulletIndex, val) =>
                        mutateAt("projects", index, (item) => { item.bullets[bulletIndex] = val; })
                      }
                      onAdd={() =>
                        mutateAt("projects", index, (item) => { item.bullets.push("New detail..."); })
                      }
                      isEditing={isEditing}
                    />
                  </div>
                </div>
              );
            })}

            {isEditing && (
              <AddSectionButton
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    projects: [
                      ...prev.projects,
                      {
                        id: Math.random().toString(),
                        startDate: "2025",
                        endDate: "Present",
                        role: "Founder",
                        name: "Project Name",
                        bullets: ["Describe project here"],
                      },
                    ],
                  }))
                }
              >
                + Add project
              </AddSectionButton>
            )}
          </div>
        </section>

        {/* Education */}
        <section className="mt-14 sm:mt-16">
          <SectionHead title="Education" span={spanOf(data.education)} />

          <div className="mt-8 space-y-8">
            {data.education.map((edu, index) => (
              <div key={edu.id} className="grid grid-cols-[40px_1fr] gap-x-5">
                {/* Keeps the text column aligned with the entries above */}
                <div aria-hidden="true" />

                <div className="min-w-0">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <EditableField
                      value={edu.degree}
                      onChange={(val) => mutateAt("education", index, (item) => { item.degree = val; })}
                      isEditing={isEditing}
                      className="text-[15px] font-semibold text-foreground"
                    />
                    <Dates
                      value={`${edu.startDate} - ${edu.endDate}`}
                      onChange={(val) => {
                        const parts = val.split(" - ");
                        if (parts.length !== 2) return;
                        mutateAt("education", index, (item) => {
                          item.startDate = parts[0].trim();
                          item.endDate = parts[1].trim();
                        });
                      }}
                      isEditing={isEditing}
                    />
                  </div>

                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <EditableField
                      value={edu.institution}
                      onChange={(val) => mutateAt("education", index, (item) => { item.institution = val; })}
                      isEditing={isEditing}
                      className={META}
                    />
                    {edu.location && (
                      <>
                        <span className="text-muted-foreground/30">·</span>
                        <EditableField
                          value={edu.location}
                          onChange={(val) => mutateAt("education", index, (item) => { item.location = val; })}
                          isEditing={isEditing}
                          className={META}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isEditing && (
              <AddSectionButton
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    education: [
                      ...prev.education,
                      {
                        id: Math.random().toString(),
                        startDate: "2015",
                        endDate: "2019",
                        degree: "New Degree",
                        institution: "Institution",
                        location: "Location",
                      },
                    ],
                  }))
                }
              >
                + Add education
              </AddSectionButton>
            )}
          </div>
        </section>

        {/* Skills */}
        <section className="mt-14 sm:mt-16">
          <SectionHead title="Skills" />

          <div className="mt-8 space-y-6">
            {data.skills.map((skillGroup, index) => (
              <div key={skillGroup.id} className="grid grid-cols-[40px_1fr] gap-x-5">
                <div aria-hidden="true" />

                <div className="min-w-0">
                  <EditableField
                    value={skillGroup.category}
                    onChange={(val) => mutateAt("skills", index, (item) => { item.category = val; })}
                    isEditing={isEditing}
                    className="text-[15px] font-semibold text-foreground"
                  />

                  <div className="mt-1.5">
                    {Array.isArray(skillGroup.items) ? (
                      <div className="space-y-2.5">
                        {skillGroup.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="relative pl-4">
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-[0.62em] h-[5px] w-[5px] rounded-full bg-muted-foreground/40"
                            />
                            <EditableField
                              as="div"
                              value={item}
                              onChange={(val) =>
                                mutateAt("skills", index, (entry) => {
                                  (entry.items as string[])[itemIdx] = val;
                                })
                              }
                              isEditing={isEditing}
                              multiline
                              className={cn(META, "leading-[1.65]")}
                            />
                          </div>
                        ))}

                        {isEditing && (
                          <div className="pl-4">
                            <button
                              onClick={() =>
                                mutateAt("skills", index, (entry) => {
                                  (entry.items as string[]).push("New skill detail");
                                })
                              }
                              className={cn(
                                "rounded text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground",
                                FOCUS_RING
                              )}
                            >
                              + Add item
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <EditableField
                        as="div"
                        value={skillGroup.items}
                        onChange={(val) => mutateAt("skills", index, (item) => { item.items = val; })}
                        isEditing={isEditing}
                        multiline
                        className={cn(META, "leading-[1.7]")}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isEditing && (
              <AddSectionButton
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    skills: [
                      ...prev.skills,
                      { id: Math.random().toString(), category: "New category", items: "Skill, Skill" },
                    ],
                  }))
                }
              >
                + Add category
              </AddSectionButton>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function EditMetaInput({
  icon,
  value,
  placeholder,
  onChange,
}: {
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-24 border-b border-transparent bg-transparent text-xs outline-none transition-[width,border-color] placeholder:text-muted-foreground focus:w-48 focus:border-border"
      />
    </div>
  );
}
