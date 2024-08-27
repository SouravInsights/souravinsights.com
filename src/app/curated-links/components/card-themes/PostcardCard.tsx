import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import posthog from "posthog-js";

interface CardProps {
  title: string;
  description: string;
  url: string;
}

export function PostcardCard({ title, description, url }: CardProps) {
  const handleLinkClick = () => {
    posthog.capture("link_clicked_postcard_card", { url });
  };
  // const { isDarkMode } = useTheme();
  // const textColor = isDarkMode ? "text-gray-100" : "text-white";
  // const subTextColor = isDarkMode ? "text-gray-300" : "text-gray-200";
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-yellow-100 p-4 rounded-lg shadow-md overflow-hidden h-full"
    >
      <div className="border-2 border-dashed border-gray-400 p-4 h-full flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <h3 className={`text-lg font-semibold truncate flex-1 mr-2 `}>
            {title}
          </h3>
          <div className="bg-red-200 w-16 h-20 flex-shrink-0 flex items-center justify-center text-red-600 font-bold rounded">
            STAMP
          </div>
        </div>
        <p className={`text-sm mb-4 line-clamp-3 `}>{description}</p>
        <div className="mt-auto flex justify-between items-end">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
            onClick={handleLinkClick}
          >
            Visit <ExternalLink className="ml-1 flex-shrink-0" size={14} />
          </a>
          <span className="text-sm text-gray-500">
            Postmark: {new Date().toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
