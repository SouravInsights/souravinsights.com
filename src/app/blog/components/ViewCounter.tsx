"use client";

import React from "react";
import { Eye } from "lucide-react";
import { usePostViews } from "@/hooks/usePostViews";
import { motion } from "framer-motion";

interface ViewCounterProps {
  slug: string;
}

const ViewCounter = ({ slug }: ViewCounterProps) => {
  const { views, isLoading } = usePostViews({ slug });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400"
    >
      <Eye size={16} className="text-gray-400 dark:text-gray-500" />
      <span className="text-sm font-mono">
        {isLoading ? (
          <span className="animate-pulse">...</span>
        ) : (
          `${views.toLocaleString()} view${views !== 1 ? "s" : ""}`
        )}
      </span>
    </motion.div>
  );
};

export default ViewCounter;
