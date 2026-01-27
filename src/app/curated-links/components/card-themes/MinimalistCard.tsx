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
      className="bg-transparent p-6 rounded-lg overflow-hidden border border-border h-full flex flex-col hover:border-foreground/50 transition-colors"
    >
      <h3 className="text-xl font-light mb-4 truncate text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 truncate">{url}</p>
      <div className="mt-auto">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleLinkClick}
        >
          Visit <ExternalLink className="ml-1 flex-shrink-0" size={14} />
        </a>
      </div>
    </motion.div>
  );
}
