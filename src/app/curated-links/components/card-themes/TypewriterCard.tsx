import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

interface CardProps {
  title: string;
  description: string;
  url: string;
}

export function TypewriterCard({ title, description, url }: CardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-gray-100 p-6 rounded-lg shadow-md overflow-hidden h-full flex flex-col"
      style={{
        backgroundImage:
          "linear-gradient(0deg, #d9d9d9 1px, transparent 1px), linear-gradient(90deg, #d9d9d9 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <h3
        className="text-lg font-mono font-bold mb-2 truncate"
        style={{ textShadow: "1px 1px 0 #fff" }}
      >
        {title}
      </h3>
      <p
        className={`text-sm font-mono mb-4 text-gray-600 line-clamp-3`}
        style={{ textShadow: "0.5px 0.5px 0 #fff" }}
      >
        {description}
      </p>
      <div className="mt-auto">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-mono font-medium text-blue-600 hover:text-blue-800"
          style={{ textShadow: "0.5px 0.5px 0 #fff" }}
        >
          Visit <ExternalLink className="ml-1 flex-shrink-0" size={14} />
        </a>
      </div>
    </motion.div>
  );
}
