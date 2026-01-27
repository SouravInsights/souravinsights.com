"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { FileWarning, Eye } from "lucide-react";

interface DraftPostIndicatorProps {
  children: React.ReactNode;
  previewParagraphs?: number;
}

export default function DraftPostIndicator({
  children,
  previewParagraphs,
}: DraftPostIndicatorProps) {
  const [showFullContent, setShowFullContent] = useState(false);
  const [eyeClickCount, setEyeClickCount] = useState(0);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const childrenArray = React.Children.toArray(children);

  // Only get the visible content (limited to previewParagraphs)
  const visibleContent = childrenArray.slice(0, previewParagraphs);

  const handleEyeClick = () => {
    const newCount = eyeClickCount + 1;
    setEyeClickCount(newCount);

    if (newCount >= 5) {
      setShowPasswordInput(true);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const correctPassword = process.env.NEXT_PUBLIC_AUTHOR_DRAFT_PASSWORD;

    if (password === correctPassword) {
      setShowFullContent(true);
      setShowPasswordInput(false);
    } else {
      alert("Incorrect password");
    }
  };

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-20 z-20 mb-6 lg:mb-8 flex justify-center"
      >
        <div className="bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/50 rounded-full px-4 py-2 inline-flex items-center gap-2 shadow-sm">
          <FileWarning
            size={16}
            className="text-amber-600 dark:text-amber-400"
          />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Draft Post - Preview Only
          </span>
          <button
            onClick={handleEyeClick}
            className="ml-1 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            aria-label="Toggle visibility"
          >
            <Eye size={16} />
          </button>
        </div>
      </motion.div>

      {showPasswordInput && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex justify-center"
        >
          <form
            onSubmit={handlePasswordSubmit}
            className="flex items-center gap-2 bg-card p-2 rounded-lg shadow-md border border-border"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Eye
                size={18}
                className="text-amber-600 dark:text-amber-400 mr-1"
              />
            </motion.div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Author password"
              className="px-3 py-1.5 text-sm border border-input rounded-md bg-background text-foreground"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-sm bg-green-600 dark:bg-green-700 text-white rounded-md hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
            >
              Unlock
            </button>
          </form>
        </motion.div>
      )}

      <div ref={contentRef}>
        {showFullContent ? (
          // Show the full content if authorized
          <>{children}</>
        ) : (
          // Otherwise show only the limited preview
          <>
            {visibleContent}

            <div className="mt-8 p-6 border border-dashed border-border rounded-lg text-center bg-muted/50">
              <h4 className="text-lg font-medium text-foreground mb-2">
                This post is still being drafted
              </h4>
              <p className="text-muted-foreground">
                Check back later for the complete article!
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
