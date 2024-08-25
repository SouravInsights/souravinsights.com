import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

interface CardProps {
  title: string;
  url: string;
}

export function MinimalistCard({ title, url }: CardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white p-6 rounded-lg shadow-sm overflow-hidden border border-gray-200 h-full flex flex-col"
    >
      <h3 className="text-xl font-light mb-4 truncate">{title}</h3>
      <p className="text-sm text-gray-500 mb-4 truncate">{url}</p>
      <div className="mt-auto">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-light text-gray-600 hover:text-gray-800"
        >
          Visit <ExternalLink className="ml-1 flex-shrink-0" size={14} />
        </a>
      </div>
    </motion.div>
  );
}
