import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import posthog from "posthog-js";

interface CardProps {
  title: string;
  url: string;
}

export function MinimalistCard({ title, url }: CardProps) {
  const handleLinkClick = () => {
    posthog.capture("link_clicked_minimalist_card", { url });
  };
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white dark:bg-card p-6 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-border h-full flex flex-col"
    >
      <h3 className="text-xl font-light mb-4 truncate dark:text-foreground">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-muted-foreground mb-4 truncate">{url}</p>
      <div className="mt-auto">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-light text-gray-600 dark:text-muted-foreground hover:text-gray-800 dark:hover:text-foreground"
          onClick={handleLinkClick}
        >
          Visit <ExternalLink className="ml-1 flex-shrink-0" size={14} />
        </a>
      </div>
    </motion.div>
  );
}
