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

export function RetroTechCard({ title, description, url }: CardProps) {
  const handleLinkClick = () => {
    posthog.capture("link_clicked_retrotech_card", { url });
  };
  const { isDarkMode } = useTheme();
  const textColor = isDarkMode ? "text-gray-100" : "text-white";
  const subTextColor = isDarkMode ? "text-gray-300" : "text-gray-200";
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-gray-900 p-4 rounded-lg shadow-md overflow-hidden text-green-400 font-mono h-full flex flex-col"
      style={{
        boxShadow:
          "0 0 10px rgba(0, 255, 0, 0.5), 0 0 20px rgba(0, 255, 0, 0.3), 0 0 30px rgba(0, 255, 0, 0.1)",
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(0, 255, 0, 0.15), rgba(0, 255, 0, 0.15) 1px, transparent 1px, transparent 2px)",
      }}
    >
      <h3 className={`text-lg font-bold mb-2 truncate ${textColor}`}>
        {" "}
        {title}
      </h3>
      <p className={`text-sm mb-4 line-clamp-3 ${subTextColor}`}>
        {description}
      </p>
      <div className="mt-auto">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm font-medium hover:text-green-300"
          onClick={handleLinkClick}
        >
          Visit <ExternalLink className="ml-1 flex-shrink-0" size={14} />
        </a>
      </div>
    </motion.div>
  );
}
