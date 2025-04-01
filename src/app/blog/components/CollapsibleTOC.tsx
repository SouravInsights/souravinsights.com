"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft, BookOpen, Menu } from "lucide-react";

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface CollapsibleTOCProps {
  tableOfContents: TOCItem[];
  activeHeading: string;
  onCollapseChange?: (collapsed: boolean) => void;
}

export default function CollapsibleTOC({
  tableOfContents,
  activeHeading,
  onCollapseChange,
}: CollapsibleTOCProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Notify parent component when collapse state changes
  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(isCollapsed);
    }
  }, [isCollapsed, onCollapseChange]);

  if (tableOfContents.length === 0) {
    return null;
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Expanded View */}
      {!isCollapsed ? (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.4 }}
          className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
        >
          {/* TOC Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex space-x-2 mr-3">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                toc.md
              </span>
            </div>

            {/* Toggle button */}
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors flex items-center"
              aria-label="Collapse table of contents"
            >
              <span className="text-xs mr-1 text-gray-500 dark:text-gray-400">
                Collapse
              </span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* TOC Content */}
          <div className="p-4">
            <nav className="overflow-y-auto max-h-[70vh] font-mono">
              <ul className="space-y-1">
                {tableOfContents.map((heading) => (
                  <li
                    key={heading.id}
                    style={{
                      marginLeft: `${(heading.level - 1) * 0.75}rem`,
                    }}
                  >
                    <a
                      href={`#${heading.id}`}
                      className={`text-sm hover:text-green-600 dark:hover:text-green-400 transition-colors flex items-center py-1 truncate ${
                        activeHeading === heading.id
                          ? "text-green-600 dark:text-green-400 font-medium"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(heading.id)?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }}
                    >
                      {activeHeading === heading.id && (
                        <ChevronRight className="h-3 w-3 mr-1 flex-shrink-0" />
                      )}
                      <span className="truncate">{heading.text}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </motion.div>
      ) : (
        // Collapsed View - Elegant tab design
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.4 }}
          className="mx-auto w-12 bg-white dark:bg-gray-800 h-auto rounded-md border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
        >
          <div
            onClick={toggleCollapse}
            className="h-full py-6 flex flex-col items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200"
            title="Expand table of contents"
          >
            <div className="flex items-center justify-center">
              <ChevronLeft
                size={18}
                className="text-gray-500 dark:text-gray-400"
              />
            </div>
            <div className="flex flex-col items-center pt-2">
              <BookOpen
                size={18}
                className="text-gray-500 dark:text-gray-400 mb-3"
              />

              {/* Small dots to indicate there are multiple items */}
              <div className="flex flex-col space-y-1.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    activeHeading
                      ? "bg-green-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                ></div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              </div>
            </div>
            <div className="h-5"></div> {/* Empty spacer for balance */}
          </div>
        </motion.div>
      )}
    </>
  );
}
