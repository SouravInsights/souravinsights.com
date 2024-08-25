import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

interface CardProps {
  title: string;
  url: string;
  gradientStart: string;
  gradientEnd: string;
}

export function TiltedCard({
  title,
  url,
  gradientStart,
  gradientEnd,
}: CardProps) {
  const gradientStyle = {
    background: `linear-gradient(to bottom right, ${gradientStart}, ${gradientEnd})`,
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05, rotate: 0 }}
      className="group h-full"
      style={{ transformOrigin: "center" }}
    >
      <div
        className="p-5 rounded-lg shadow-md overflow-hidden transition-all duration-300 transform -rotate-1 group-hover:rotate-0 h-full flex flex-col"
        style={gradientStyle}
      >
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
