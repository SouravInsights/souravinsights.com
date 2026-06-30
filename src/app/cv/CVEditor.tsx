"use client";

import React, { useState } from "react";
import { CVData } from "@/types/cv";
import { EditableField } from "@/components/EditableField";
import { saveCVData, loginAdmin } from "./actions";
import { cn } from "@/lib/utils";

interface CVEditorProps {
  initialData: CVData;
  isEditing: boolean;
  secretToLogin?: string;
}

export function CVEditor({ initialData, isEditing, secretToLogin }: CVEditorProps) {
  const [data, setData] = useState<CVData>(initialData);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (secretToLogin) {
      loginAdmin(secretToLogin);
      // Clean up the URL so the secret isn't visible
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [secretToLogin]);

  const handleSave = async () => {
    setIsSaving(true);
    const res = await saveCVData(data);
    setIsSaving(false);
    if (!res.success) {
      alert("Failed to save: " + res.error);
    }
  };

  const updateHeader = (key: keyof CVData["header"], value: string) => {
    setData((prev) => ({ ...prev, header: { ...prev.header, [key]: value } }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-6 sm:p-12 md:p-20 selection:bg-primary/20">
      {isEditing && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium shadow-lg transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-16">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <EditableField
              as="h1"
              value={data.header.name}
              onChange={(val) => updateHeader("name", val)}
              isEditing={isEditing}
              className="text-3xl font-bold tracking-tight text-foreground"
            />
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <EditableField
                value={data.header.location}
                onChange={(val) => updateHeader("location", val)}
                isEditing={isEditing}
              />
              <span className="opacity-50">•</span>
              <EditableField
                value={data.header.phone}
                onChange={(val) => updateHeader("phone", val)}
                isEditing={isEditing}
              />
              <span className="opacity-50">•</span>
              <EditableField
                value={data.header.email}
                onChange={(val) => updateHeader("email", val)}
                isEditing={isEditing}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground pt-1">
              <EditableField
                value={data.header.website}
                onChange={(val) => updateHeader("website", val)}
                isEditing={isEditing}
              />
              <span className="opacity-50">•</span>
              <EditableField
                value={data.header.linkedin}
                onChange={(val) => updateHeader("linkedin", val)}
                isEditing={isEditing}
              />
              <span className="opacity-50">•</span>
              <EditableField
                value={data.header.twitter}
                onChange={(val) => updateHeader("twitter", val)}
                isEditing={isEditing}
              />
            </div>
          </div>
          <button className="text-sm px-4 py-1.5 rounded-full border border-border hover:bg-muted transition-colors text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Download PDF
          </button>
        </header>

        {/* About */}
        <section className="space-y-4">
          <h2 className="text-sm text-muted-foreground font-medium uppercase tracking-wider">About</h2>
          <EditableField
            as="p"
            value={data.about}
            onChange={(val) => setData((prev) => ({ ...prev, about: val }))}
            isEditing={isEditing}
            multiline
            className="text-sm leading-relaxed text-foreground"
          />
        </section>

        {/* Work Experience */}
        <section className="space-y-8">
          <h2 className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Work Experience</h2>
          
          <div className="space-y-12">
            {data.workExperience.map((job, index) => (
              <div key={job.id} className="grid sm:grid-cols-[140px_1fr] gap-4 sm:gap-8">
                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                  <EditableField
                    value={`${job.startDate} - ${job.endDate}`}
                    onChange={(val) => {
                      const parts = val.split(" - ");
                      const newExp = [...data.workExperience];
                      if (parts.length === 2) {
                        newExp[index].startDate = parts[0].trim();
                        newExp[index].endDate = parts[1].trim();
                      }
                      setData((prev) => ({ ...prev, workExperience: newExp }));
                    }}
                    isEditing={isEditing}
                    className="block"
                  />
                  <EditableField
                    as="div"
                    value={job.location}
                    onChange={(val) => {
                      const newExp = [...data.workExperience];
                      newExp[index].location = val;
                      setData((prev) => ({ ...prev, workExperience: newExp }));
                    }}
                    isEditing={isEditing}
                    className="opacity-70 text-xs"
                  />
                </div>
                
                <div className="space-y-4 text-sm text-foreground">
                  <div>
                    <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                      <EditableField
                        as="span"
                        value={job.role}
                        onChange={(val) => {
                          const newExp = [...data.workExperience];
                          newExp[index].role = val;
                          setData((prev) => ({ ...prev, workExperience: newExp }));
                        }}
                        isEditing={isEditing}
                      />
                      <span className="font-normal text-muted-foreground">at</span>
                      
                      {/* Inline Logo */}
                      <div className="inline-flex items-center group relative">
                        {job.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={job.logoUrl} alt="" className="w-4 h-4 rounded-sm object-cover" />
                        ) : (
                          isEditing && (
                            <div className="w-4 h-4 rounded-sm bg-muted border border-dashed border-border flex items-center justify-center">
                              <span className="text-[8px] opacity-50">+</span>
                            </div>
                          )
                        )}
                        {isEditing && (
                          <div className="absolute left-0 top-full mt-1 z-10 w-48 opacity-0 group-hover:opacity-100 transition-opacity">
                            <input 
                              type="text" 
                              value={job.logoUrl || ""} 
                              onChange={(e) => {
                                const newExp = [...data.workExperience];
                                newExp[index].logoUrl = e.target.value;
                                setData((prev) => ({ ...prev, workExperience: newExp }));
                              }}
                              className="w-full text-xs bg-background border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
                              placeholder="Logo URL..."
                            />
                          </div>
                        )}
                      </div>

                      <EditableField
                        as="span"
                        value={job.company}
                        onChange={(val) => {
                          const newExp = [...data.workExperience];
                          newExp[index].company = val;
                          setData((prev) => ({ ...prev, workExperience: newExp }));
                        }}
                        isEditing={isEditing}
                      />
                    </div>
                  </div>
                  
                  <ul className="list-disc pl-4 space-y-2 text-muted-foreground marker:text-muted-foreground/50">
                    {job.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex}>
                        <EditableField
                          value={bullet}
                          onChange={(val) => {
                            const newExp = [...data.workExperience];
                            newExp[index].bullets[bulletIndex] = val;
                            setData((prev) => ({ ...prev, workExperience: newExp }));
                          }}
                          isEditing={isEditing}
                          multiline
                        />
                      </li>
                    ))}
                  </ul>
                  
                  {isEditing && (
                    <div className="flex gap-2 text-xs">
                      <button 
                        onClick={() => {
                          const newExp = [...data.workExperience];
                          newExp[index].bullets.push("New detail...");
                          setData((prev) => ({ ...prev, workExperience: newExp }));
                        }}
                        className="text-primary hover:underline focus-visible:outline-none"
                      >
                        + Add Bullet
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isEditing && (
              <button 
                onClick={() => {
                  setData((prev) => ({
                    ...prev,
                    workExperience: [
                      ...prev.workExperience,
                      {
                        id: Math.random().toString(),
                        startDate: "2024",
                        endDate: "Present",
                        role: "Role",
                        company: "Company",
                        location: "Location",
                        bullets: ["Detail your work here"]
                      }
                    ]
                  }));
                }}
                className="text-primary text-sm hover:underline focus-visible:outline-none"
              >
                + Add Work Experience
              </button>
            )}
          </div>
        </section>

        {/* Independent Projects */}
        <section className="space-y-8">
          <h2 className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Independent Projects</h2>
          
          <div className="space-y-12">
            {data.projects.map((project, index) => (
              <div key={project.id} className="grid sm:grid-cols-[140px_1fr] gap-4 sm:gap-8">
                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                  <EditableField
                    value={`${project.startDate} - ${project.endDate}`}
                    onChange={(val) => {
                      const parts = val.split(" - ");
                      const newProj = [...data.projects];
                      if (parts.length === 2) {
                        newProj[index].startDate = parts[0].trim();
                        newProj[index].endDate = parts[1].trim();
                      }
                      setData((prev) => ({ ...prev, projects: newProj }));
                    }}
                    isEditing={isEditing}
                    className="block"
                  />
                </div>
                
                <div className="space-y-4 text-sm text-foreground">
                  <div>
                    <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                      <EditableField
                        as="span"
                        value={project.role}
                        onChange={(val) => {
                          const newProj = [...data.projects];
                          newProj[index].role = val;
                          setData((prev) => ({ ...prev, projects: newProj }));
                        }}
                        isEditing={isEditing}
                      />
                      
                      {/* Inline Logo */}
                      <div className="inline-flex items-center group relative ml-1">
                        {project.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={project.logoUrl} alt="" className="w-4 h-4 rounded-sm object-cover" />
                        ) : (
                          isEditing && (
                            <div className="w-4 h-4 rounded-sm bg-muted border border-dashed border-border flex items-center justify-center">
                              <span className="text-[8px] opacity-50">+</span>
                            </div>
                          )
                        )}
                        {isEditing && (
                          <div className="absolute left-0 top-full mt-1 z-10 w-48 opacity-0 group-hover:opacity-100 transition-opacity">
                            <input 
                              type="text" 
                              value={project.logoUrl || ""} 
                              onChange={(e) => {
                                const newProj = [...data.projects];
                                newProj[index].logoUrl = e.target.value;
                                setData((prev) => ({ ...prev, projects: newProj }));
                              }}
                              className="w-full text-xs bg-background border border-border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
                              placeholder="Logo URL..."
                            />
                          </div>
                        )}
                      </div>

                      <EditableField
                        as="span"
                        value={project.name}
                        onChange={(val) => {
                          const newProj = [...data.projects];
                          newProj[index].name = val;
                          setData((prev) => ({ ...prev, projects: newProj }));
                        }}
                        isEditing={isEditing}
                      />
                    </div>
                  </div>
                  
                  <ul className="list-disc pl-4 space-y-2 text-muted-foreground marker:text-muted-foreground/50">
                    {project.bullets.map((bullet, bulletIndex) => (
                      <li key={bulletIndex}>
                        <EditableField
                          value={bullet}
                          onChange={(val) => {
                            const newProj = [...data.projects];
                            newProj[index].bullets[bulletIndex] = val;
                            setData((prev) => ({ ...prev, projects: newProj }));
                          }}
                          isEditing={isEditing}
                          multiline
                        />
                      </li>
                    ))}
                  </ul>
                  
                  {isEditing && (
                    <div className="flex gap-2 text-xs">
                      <button 
                        onClick={() => {
                          const newProj = [...data.projects];
                          newProj[index].bullets.push("New detail...");
                          setData((prev) => ({ ...prev, projects: newProj }));
                        }}
                        className="text-primary hover:underline focus-visible:outline-none"
                      >
                        + Add Bullet
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isEditing && (
              <button 
                onClick={() => {
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
                        bullets: ["Describe project here"]
                      }
                    ]
                  }));
                }}
                className="text-primary text-sm hover:underline focus-visible:outline-none"
              >
                + Add Project
              </button>
            )}
          </div>
        </section>

        {/* Education */}
        <section className="space-y-8">
          <h2 className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Education</h2>
          
          <div className="space-y-8">
            {data.education.map((edu, index) => (
              <div key={edu.id} className="grid sm:grid-cols-[140px_1fr] gap-4 sm:gap-8">
                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                  <EditableField
                    value={`${edu.startDate} - ${edu.endDate}`}
                    onChange={(val) => {
                      const parts = val.split(" - ");
                      const newEdu = [...data.education];
                      if (parts.length === 2) {
                        newEdu[index].startDate = parts[0].trim();
                        newEdu[index].endDate = parts[1].trim();
                      }
                      setData((prev) => ({ ...prev, education: newEdu }));
                    }}
                    isEditing={isEditing}
                    className="block"
                  />
                  <EditableField
                    as="div"
                    value={edu.location}
                    onChange={(val) => {
                      const newEdu = [...data.education];
                      newEdu[index].location = val;
                      setData((prev) => ({ ...prev, education: newEdu }));
                    }}
                    isEditing={isEditing}
                    className="opacity-70 text-xs"
                  />
                </div>
                
                <div className="text-sm text-foreground">
                  <EditableField
                    as="div"
                    value={edu.degree}
                    onChange={(val) => {
                      const newEdu = [...data.education];
                      newEdu[index].degree = val;
                      setData((prev) => ({ ...prev, education: newEdu }));
                    }}
                    isEditing={isEditing}
                    className="font-semibold"
                  />
                  <EditableField
                    as="div"
                    value={edu.institution}
                    onChange={(val) => {
                      const newEdu = [...data.education];
                      newEdu[index].institution = val;
                      setData((prev) => ({ ...prev, education: newEdu }));
                    }}
                    isEditing={isEditing}
                    className="text-muted-foreground mt-1"
                  />
                </div>
              </div>
            ))}
            
            {isEditing && (
              <button 
                onClick={() => {
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
                      }
                    ]
                  }));
                }}
                className="text-primary text-sm hover:underline focus-visible:outline-none"
              >
                + Add Education
              </button>
            )}
          </div>
        </section>

        {/* Skills */}
        <section className="space-y-8">
          <h2 className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Skills</h2>
          
          <div className="space-y-4">
            {data.skills.map((skillGroup, index) => (
              <div key={skillGroup.id} className="text-sm">
                <div className="font-semibold text-foreground mb-1">
                  <EditableField
                    as="span"
                    value={skillGroup.category}
                    onChange={(val) => {
                      const newSkills = [...data.skills];
                      newSkills[index].category = val;
                      setData((prev) => ({ ...prev, skills: newSkills }));
                    }}
                    isEditing={isEditing}
                  />
                </div>
                
                {Array.isArray(skillGroup.items) ? (
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground marker:text-muted-foreground/50">
                    {skillGroup.items.map((item, itemIdx) => (
                      <li key={itemIdx}>
                        <EditableField
                          value={item}
                          onChange={(val) => {
                            const newSkills = [...data.skills];
                            (newSkills[index].items as string[])[itemIdx] = val;
                            setData((prev) => ({ ...prev, skills: newSkills }));
                          }}
                          isEditing={isEditing}
                          multiline
                        />
                      </li>
                    ))}
                    {isEditing && (
                      <li className="list-none -ml-4 mt-2">
                        <button 
                          onClick={() => {
                            const newSkills = [...data.skills];
                            (newSkills[index].items as string[]).push("New skill detail");
                            setData((prev) => ({ ...prev, skills: newSkills }));
                          }}
                          className="text-primary hover:underline focus-visible:outline-none text-xs"
                        >
                          + Add Item
                        </button>
                      </li>
                    )}
                  </ul>
                ) : (
                  <div className="text-muted-foreground leading-relaxed">
                    <EditableField
                      as="span"
                      value={skillGroup.items}
                      onChange={(val) => {
                        const newSkills = [...data.skills];
                        newSkills[index].items = val;
                        setData((prev) => ({ ...prev, skills: newSkills }));
                      }}
                      isEditing={isEditing}
                      multiline
                    />
                  </div>
                )}
              </div>
            ))}
            
            {isEditing && (
              <button 
                onClick={() => {
                  setData((prev) => ({
                    ...prev,
                    skills: [
                      ...prev.skills,
                      {
                        id: Math.random().toString(),
                        category: "New Skill Area",
                        items: "Details...",
                      }
                    ]
                  }));
                }}
                className="text-primary text-sm hover:underline focus-visible:outline-none"
              >
                + Add Skill Category
              </button>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
