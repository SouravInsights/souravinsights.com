"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { SmallProject } from "./projects-data";

/**
 * Smaller projects stay collapsed by default so they never compete with the
 * featured work. They're one click away for anyone who wants the full list.
 */
export function MoreProjects({ projects }: { projects: SmallProject[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="more-projects"
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 type-caption font-medium text-foreground hover:bg-accent transition-colors"
        >
          {open ? "Hide" : `Show ${projects.length} more`}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="more-projects"
            key="more-projects"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 pt-6">
              {projects.map((project, index) => (
                <motion.a
                  key={project.name}
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={project.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + index * 0.05, duration: 0.25 }}
                  className="group card card-interactive flex flex-col items-center gap-3 p-3"
                >
                  <div className="relative w-12 h-12">
                    <Image
                      src={project.logo}
                      alt={`${project.name} logo`}
                      fill
                      className="rounded-full object-cover"
                    />
                  </div>
                  <span className="type-caption font-medium text-center text-foreground group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors">
                    {project.name}
                  </span>
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}