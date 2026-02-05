"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface ExpandableSectionProps {
  children: React.ReactNode;
  gistUrl?: string;
  title?: string;
  collapsedHeight?: string;
}

export default function ExpandableSection({
  children,
  gistUrl,
  title = "Embedded Content",
  collapsedHeight = "max-h-[300px]",
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          {title}
        </h3>
        {gistUrl && (
          <a
            href={gistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1 text-green-600 dark:text-green-500 hover:underline"
          >
            Open GitHub Gist
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Content Area */}
      <div className="relative">
        <div
          className={`px-6 py-4 transition-all duration-300 ease-in-out ${
            isExpanded ? "" : `${collapsedHeight} overflow-hidden`
          }`}
        >
          {children}
        </div>

        {/* Gradient Overlay (only when collapsed) */}
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-t border-gray-100 dark:border-gray-800"
      >
        {isExpanded ? (
          <>
            Show less <ChevronUp size={14} />
          </>
        ) : (
          <>
            Show full content <ChevronDown size={14} />
          </>
        )}
      </button>
    </div>
  );
}
