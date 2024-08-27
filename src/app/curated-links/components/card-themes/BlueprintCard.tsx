import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import posthog from "posthog-js";

interface CardProps {
  title: string;
  description: string;
  url: string;
}

export function BlueprintCard({ title, description, url }: CardProps) {
  const handleLinkClick = () => {
    posthog.capture("link_clicked_blueprint_card", { url });
  };
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-blue-900 p-6 rounded-lg shadow-md overflow-hidden h-full flex flex-col"
    >
      <div className="border-2 border-blue-300 p-4 flex-grow flex flex-col">
        <h3 className="text-lg font-mono font-bold mb-2 text-blue-300 truncate">
          {title}
        </h3>
        <p className={`text-sm mb-4 font-mono text-blue-200 line-clamp-3`}>
          {description}
        </p>
        <div className="mt-auto">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-mono font-medium text-blue-300 hover:text-blue-100"
            onClick={handleLinkClick}
          >
            Visit <ExternalLink className="ml-1 flex-shrink-0" size={14} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
