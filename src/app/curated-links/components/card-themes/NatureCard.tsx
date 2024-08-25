import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

interface CardProps {
  title: string;
  url: string;
}

export function NatureCard({ title, url }: CardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-green-50 p-6 rounded-full shadow-md overflow-hidden h-full flex flex-col justify-center items-center"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%)",
        boxShadow:
          "0 4px 6px rgba(0, 100, 0, 0.1), 0 1px 3px rgba(0, 100, 0, 0.08)",
      }}
    >
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2 text-green-800 truncate max-w-full">
          {title}
        </h3>
        <p className="text-sm text-green-600 mb-4 truncate max-w-full">{url}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-medium text-green-700 hover:text-green-900"
        >
          Visit <ExternalLink className="ml-1 flex-shrink-0" size={14} />
        </a>
      </div>
    </motion.div>
  );
}
