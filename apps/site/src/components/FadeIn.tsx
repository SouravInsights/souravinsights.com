"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  /** Travel distance upward, in px. 20 for headers, 8 for list rows. */
  y?: number;
  duration?: number;
  delay?: number;
  className?: string;
}

/**
 * The single entrance animation used across the site, so every page rises the
 * same way: headers at y=20 / 0.5s, list rows at y=8 / 0.3s with a small
 * stagger. Lives in a client component so server pages can use it too.
 */
export function FadeIn({
  children,
  y = 8,
  duration = 0.3,
  delay = 0,
  className,
}: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        // A punchy ease-out: the entrance starts fast and settles, so pages
        // read instantly instead of feeling like they load slowly.
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      {children}
    </motion.div>
  );
}