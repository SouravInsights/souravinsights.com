"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileWarning, Eye, EyeOff } from "lucide-react";
import { hasAdminHint } from "@/lib/admin-client";

interface DraftPostIndicatorProps {
  children: React.ReactNode;
  previewParagraphs?: number;
}

/** A draft shows as a teaser; a signed-in admin can expand it. */
export default function DraftPostIndicator({
  children,
  previewParagraphs,
}: DraftPostIndicatorProps) {
  const [showFull, setShowFull] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(hasAdminHint());
  }, []);

  const visibleContent = React.Children.toArray(children).slice(
    0,
    previewParagraphs
  );

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 lg:mb-8 flex justify-center"
      >
        <div className="bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/50 rounded-full px-4 py-2 inline-flex items-center gap-2 shadow-sm">
          <FileWarning
            size={16}
            className="text-amber-700 dark:text-amber-400"
          />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Draft Post - Preview Only
          </span>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowFull((full) => !full)}
              aria-pressed={showFull}
              aria-label={showFull ? "Show preview only" : "Show full draft"}
              title={showFull ? "Show preview only" : "Show full draft"}
              className="ml-1 text-amber-700 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            >
              {showFull ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
      </motion.div>

      {showFull ? (
        <>{children}</>
      ) : (
        <>
          <div className="draft-preview-fade">{visibleContent}</div>

          <div className="mt-2 p-6 border border-dashed border-border rounded-lg text-center bg-muted/50">
            <h4 className="type-heading mb-2">
              This post is still being drafted
            </h4>
            <p className="type-body text-muted-foreground">
              Check back later for the complete article!
            </p>
          </div>
        </>
      )}
    </div>
  );
}
