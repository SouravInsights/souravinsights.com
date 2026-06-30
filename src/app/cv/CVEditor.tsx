"use client";

import React, { useState } from "react";
import { CVData } from "@/types/cv";
import { EditableField } from "@/components/EditableField";
import { saveCVData, loginAdmin } from "./actions";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";

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

  const LogoPlaceholder = ({ 
    url, 
    onChange 
  }: { 
    url?: string, 
    onChange: (val: string) => void 
  }) => {
    return (
      <div className="relative group shrink-0 w-10 h-10 rounded-full border border-border/50 bg-secondary/30 flex items-center justify-center overflow-hidden">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          isEditing && <span className="text-xs text-muted-foreground/50">+</span>
        )}
        {isEditing && (
          <div className={cn(
            "absolute inset-0 bg-background/90 flex flex-col items-center justify-center transition-opacity",
            url ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          )}>
            <input 
              type="text" 
              value={url || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="URL"
              className="w-full text-[9px] bg-transparent text-center outline-none px-1 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans px-5 pb-12 pt-28 sm:pb-20 sm:pt-36 selection:bg-primary/20">
      
      {/* Floating Save Bar for Admin */}
      {isEditing && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background/80 backdrop-blur-md border border-border px-4 py-3 rounded-full shadow-2xl">
          <span className="text-sm font-medium text-muted-foreground ml-2">Edit Mode Active</span>
          <div className="w-[1px] h-4 bg-border mx-2"></div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}

      {/* Main Content Container */}
      <div className="max-w-[720px] mx-auto space-y-20">
        
        {/* Header Region */}
        <header className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="space-y-3">
              <EditableField
                as="h1"
                value={data.header.name}
                onChange={(val) => updateHeader("name", val)}
                isEditing={isEditing}
                className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
              />
              
              {/* Contact Links */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground font-medium">
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
                  className="hover:text-foreground transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground font-medium">
                <EditableField
                  value={data.header.website}
                  onChange={(val) => updateHeader("website", val)}
                  isEditing={isEditing}
                  className="hover:text-foreground transition-colors"
                />
                <span className="text-muted-foreground/30">·</span>
                <EditableField
                  value={data.header.linkedin}
                  onChange={(val) => updateHeader("linkedin", val)}
                  isEditing={isEditing}
                  className="hover:text-foreground transition-colors"
                />
                <span className="text-muted-foreground/30">·</span>
                <EditableField
                  value={data.header.twitter}
                  onChange={(val) => updateHeader("twitter", val)}
                  isEditing={isEditing}
                  className="hover:text-foreground transition-colors"
                />
              </div>
            </div>

            <button className="shrink-0 inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </header>

        {/* About */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">About</h2>
          <div className="text-base leading-relaxed text-foreground/90 font-normal">
            <EditableField
              as="p"
              value={data.about}
              onChange={(val) => setData((prev) => ({ ...prev, about: val }))}
              isEditing={isEditing}
              multiline
            />
          </div>
        </section>

        {/* Work Experience */}
        <section className="space-y-8">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-4">Experience</h2>
          
          <div className="space-y-12">
            {data.workExperience.map((job, index) => (
              <div key={job.id} className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 sm:gap-8 group">
                <div className="text-sm text-muted-foreground font-medium pt-1">
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
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    {(job.logoUrl || isEditing) && (
                      <LogoPlaceholder 
                        url={job.logoUrl} 
                        onChange={(val) => {
                          const newExp = [...data.workExperience];
                          newExp[index].logoUrl = val;
                          setData((prev) => ({ ...prev, workExperience: newExp }));
                        }} 
                      />
                    )}
                    
                    <div className="space-y-1 flex-1">
                      <div className="text-base font-semibold text-foreground">
                        <EditableField
                          value={job.role}
                          onChange={(val) => {
                            const newExp = [...data.workExperience];
                            newExp[index].role = val;
                            setData((prev) => ({ ...prev, workExperience: newExp }));
                          }}
                          isEditing={isEditing}
                        />
                      </div>
                      <div className="text-sm font-medium text-foreground/70 flex flex-wrap gap-2">
                        <EditableField
                          value={job.company}
                          onChange={(val) => {
                            const newExp = [...data.workExperience];
                            newExp[index].company = val;
                            setData((prev) => ({ ...prev, workExperience: newExp }));
                          }}
                          isEditing={isEditing}
                        />
                        <span className="text-muted-foreground/30">·</span>
                        <EditableField
                          value={job.location}
                          onChange={(val) => {
                            const newExp = [...data.workExperience];
                            newExp[index].location = val;
                            setData((prev) => ({ ...prev, workExperience: newExp }));
                          }}
                          isEditing={isEditing}
                          className="text-muted-foreground"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-[15px] leading-relaxed text-muted-foreground space-y-2">
                    {job.bullets.map((bullet, bulletIndex) => (
                      <div key={bulletIndex} className="relative pl-4">
                        <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-border"></span>
                        <EditableField
                          as="div"
                          value={bullet}
                          onChange={(val) => {
                            const newExp = [...data.workExperience];
                            newExp[index].bullets[bulletIndex] = val;
                            setData((prev) => ({ ...prev, workExperience: newExp }));
                          }}
                          isEditing={isEditing}
                          multiline
                        />
                      </div>
                    ))}
                  </div>
                  
                  {isEditing && (
                    <div className="pl-4">
                      <button 
                        onClick={() => {
                          const newExp = [...data.workExperience];
                          newExp[index].bullets.push("New detail...");
                          setData((prev) => ({ ...prev, workExperience: newExp }));
                        }}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
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
                        role: "New Role",
                        company: "Company",
                        location: "Location",
                        bullets: ["Detail your work here"]
                      }
                    ]
                  }));
                }}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Add Experience
              </button>
            )}
          </div>
        </section>

        {/* Independent Projects */}
        <section className="space-y-8">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-4">Independent Projects</h2>
          
          <div className="space-y-12">
            {data.projects.map((project, index) => (
              <div key={project.id} className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 sm:gap-8 group">
                <div className="text-sm text-muted-foreground font-medium pt-1">
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
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    {(project.logoUrl || isEditing) && (
                      <LogoPlaceholder 
                        url={project.logoUrl} 
                        onChange={(val) => {
                          const newProj = [...data.projects];
                          newProj[index].logoUrl = val;
                          setData((prev) => ({ ...prev, projects: newProj }));
                        }} 
                      />
                    )}
                    
                    <div className="space-y-1 flex-1">
                      <div className="text-base font-semibold text-foreground">
                        <EditableField
                          value={project.name}
                          onChange={(val) => {
                            const newProj = [...data.projects];
                            newProj[index].name = val;
                            setData((prev) => ({ ...prev, projects: newProj }));
                          }}
                          isEditing={isEditing}
                        />
                      </div>
                      <div className="text-sm font-medium text-foreground/70">
                        <EditableField
                          value={project.role}
                          onChange={(val) => {
                            const newProj = [...data.projects];
                            newProj[index].role = val;
                            setData((prev) => ({ ...prev, projects: newProj }));
                          }}
                          isEditing={isEditing}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-[15px] leading-relaxed text-muted-foreground space-y-2">
                    {project.bullets.map((bullet, bulletIndex) => (
                      <div key={bulletIndex} className="relative pl-4">
                        <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-border"></span>
                        <EditableField
                          as="div"
                          value={bullet}
                          onChange={(val) => {
                            const newProj = [...data.projects];
                            newProj[index].bullets[bulletIndex] = val;
                            setData((prev) => ({ ...prev, projects: newProj }));
                          }}
                          isEditing={isEditing}
                          multiline
                        />
                      </div>
                    ))}
                  </div>
                  
                  {isEditing && (
                    <div className="pl-4">
                      <button 
                        onClick={() => {
                          const newProj = [...data.projects];
                          newProj[index].bullets.push("New detail...");
                          setData((prev) => ({ ...prev, projects: newProj }));
                        }}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
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
                className="text-sm font-medium text-primary hover:underline"
              >
                + Add Project
              </button>
            )}
          </div>
        </section>

        {/* Education */}
        <section className="space-y-8">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-4">Education</h2>
          
          <div className="space-y-8">
            {data.education.map((edu, index) => (
              <div key={edu.id} className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 sm:gap-8 group">
                <div className="text-sm text-muted-foreground font-medium pt-1">
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
                </div>
                
                <div className="space-y-1">
                  <div className="text-base font-semibold text-foreground">
                    <EditableField
                      value={edu.degree}
                      onChange={(val) => {
                        const newEdu = [...data.education];
                        newEdu[index].degree = val;
                        setData((prev) => ({ ...prev, education: newEdu }));
                      }}
                      isEditing={isEditing}
                    />
                  </div>
                  <div className="text-sm font-medium text-foreground/70 flex flex-wrap gap-2">
                    <EditableField
                      value={edu.institution}
                      onChange={(val) => {
                        const newEdu = [...data.education];
                        newEdu[index].institution = val;
                        setData((prev) => ({ ...prev, education: newEdu }));
                      }}
                      isEditing={isEditing}
                    />
                    <span className="text-muted-foreground/30">·</span>
                    <EditableField
                      value={edu.location}
                      onChange={(val) => {
                        const newEdu = [...data.education];
                        newEdu[index].location = val;
                        setData((prev) => ({ ...prev, education: newEdu }));
                      }}
                      isEditing={isEditing}
                      className="text-muted-foreground"
                    />
                  </div>
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
                className="text-sm font-medium text-primary hover:underline"
              >
                + Add Education
              </button>
            )}
          </div>
        </section>

        {/* Skills */}
        <section className="space-y-8">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-4">Skills</h2>
          
          <div className="space-y-6">
            {data.skills.map((skillGroup, index) => (
              <div key={skillGroup.id} className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2 sm:gap-8 group">
                <div className="text-sm text-foreground font-semibold pt-1">
                  <EditableField
                    value={skillGroup.category}
                    onChange={(val) => {
                      const newSkills = [...data.skills];
                      newSkills[index].category = val;
                      setData((prev) => ({ ...prev, skills: newSkills }));
                    }}
                    isEditing={isEditing}
                  />
                </div>
                
                <div className="text-[15px] leading-relaxed text-muted-foreground">
                  {Array.isArray(skillGroup.items) ? (
                    <div className="space-y-2">
                      {skillGroup.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="relative pl-4">
                          <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-border"></span>
                          <EditableField
                            as="div"
                            value={item}
                            onChange={(val) => {
                              const newSkills = [...data.skills];
                              (newSkills[index].items as string[])[itemIdx] = val;
                              setData((prev) => ({ ...prev, skills: newSkills }));
                            }}
                            isEditing={isEditing}
                            multiline
                          />
                        </div>
                      ))}
                      {isEditing && (
                        <div className="pl-4">
                          <button 
                            onClick={() => {
                              const newSkills = [...data.skills];
                              (newSkills[index].items as string[]).push("New skill detail");
                              setData((prev) => ({ ...prev, skills: newSkills }));
                            }}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                          >
                            + Add Item
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EditableField
                      as="div"
                      value={skillGroup.items}
                      onChange={(val) => {
                        const newSkills = [...data.skills];
                        newSkills[index].items = val;
                        setData((prev) => ({ ...prev, skills: newSkills }));
                      }}
                      isEditing={isEditing}
                      multiline
                    />
                  )}
                </div>
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
                        category: "Category",
                        items: "Details...",
                      }
                    ]
                  }));
                }}
                className="text-sm font-medium text-primary hover:underline"
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
