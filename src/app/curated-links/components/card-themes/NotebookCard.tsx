import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

interface CardProps {
  title: string;
  description: string;
  url: string;
}

export function NotebookCard({ title, description, url }: CardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, rotate: 0 }}
      className="relative bg-white p-6 rounded-lg shadow-md overflow-hidden h-full flex flex-col"
      style={{
        backgroundImage:
          "linear-gradient(#e5e5f7 1px, transparent 1px), linear-gradient(to right, #e5e5f7 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="absolute top-0 left-0 w-full h-12 bg-red-200"></div>
      <div className="relative flex-grow">
        <h3
          className="text-xl font-handwriting mb-4 truncate"
          style={{ transform: "rotate(-2deg)" }}
        >
          {title}
        </h3>
        <p className={`text-sm mb-4 line-clamp-3 `}>{description}</p>
        <div className="mt-auto">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 font-handwriting"
          >
            Visit <ExternalLink className="ml-1 flex-shrink-0" size={14} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
