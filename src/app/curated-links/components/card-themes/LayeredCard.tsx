import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

interface CardProps {
  title: string;
  url: string;
  gradientStart: string;
  gradientEnd: string;
}

export function LayeredCard({
  title,
  url,
  gradientStart,
  gradientEnd,
}: CardProps) {
  const gradientStyle = {
    background: `linear-gradient(to bottom right, ${gradientStart}, ${gradientEnd})`,
  };

  return (
    <motion.div whileHover={{ scale: 1.05 }} className="group relative h-full">
      <div className="absolute inset-0 bg-white rounded-lg shadow-md transform rotate-3"></div>
      <div
        className="absolute inset-0 rounded-lg shadow-md transform -rotate-3"
        style={gradientStyle}
      ></div>
      <div className="relative bg-white p-5 rounded-lg shadow-md z-10 flex flex-col h-full">
        <h3 className="text-lg font-semibold mb-2 truncate">{title}</h3>
        <p className="text-sm text-gray-600 mb-4 truncate">{url}</p>
        <div className="mt-auto">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Visit <ExternalLink className="ml-1 flex-shrink-0" size={14} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
