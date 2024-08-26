import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

interface CardProps {
  title: string;
  url: string;
}

export function BlueprintCard({ title, url }: CardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-blue-900 p-6 rounded-lg shadow-md overflow-hidden h-full flex flex-col"
    >
      <div className="border-2 border-blue-300 p-4 flex-grow flex flex-col">
        <h3 className="text-lg font-mono font-bold mb-2 text-blue-300 truncate">
          {title}
        </h3>
        <p className="text-sm font-mono text-blue-200 mb-4 truncate">{url}</p>
        <div className="mt-auto">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-mono font-medium text-blue-300 hover:text-blue-100"
          >
            Visit <ExternalLink className="ml-1 flex-shrink-0" size={14} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}