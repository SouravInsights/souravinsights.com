import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import Color from "color";
import { useTheme } from "@/context/ThemeContext";

interface CardProps {
  title: string;
  url: string;
  gradientStart: string;
  gradientEnd: string;
}

function isLightColor(color: string): boolean {
  return Color(color).isLight();
}

function getContrastColor(color: string): string {
  return isLightColor(color)
    ? Color(color).darken(0.6).hex()
    : Color(color).lighten(0.6).hex();
}

export function TiltedCard({
  title,
  url,
  gradientStart,
  gradientEnd,
}: CardProps) {
  const { isDarkMode } = useTheme();

  const gradientStyle = {
    background: `linear-gradient(to bottom right, ${gradientStart}, ${gradientEnd})`,
  };

  const isLight = isLightColor(gradientStart);
  const textColor = isDarkMode
    ? "text-gray-100"
    : isLight
    ? "text-gray-800"
    : "text-white";
  const subTextColor = isDarkMode
    ? "text-gray-300"
    : isLight
    ? "text-gray-600"
    : "text-gray-200";

  const buttonBackgroundColor = isDarkMode
    ? Color(gradientEnd).darken(0.3).hex()
    : isLight
    ? Color(gradientEnd).lighten(0.1).hex()
    : Color(gradientEnd).darken(0.1).hex();
  const buttonTextColor = getContrastColor(buttonBackgroundColor);

  const buttonStyle = {
    backgroundColor: buttonBackgroundColor,
    color: buttonTextColor,
    transition: "all 0.3s ease",
  };

  const buttonHoverStyle = {
    backgroundColor: isDarkMode
      ? Color(buttonBackgroundColor).lighten(0.1).hex()
      : isLight
      ? Color(buttonBackgroundColor).darken(0.1).hex()
      : Color(buttonBackgroundColor).lighten(0.1).hex(),
  };

  // Adjust the background color to match the page background in dark mode
  const cardBackgroundColor = isDarkMode ? "bg-gray-900" : "bg-white";

  return (
    <motion.div
      className="group h-full perspective-1000"
      initial={{ rotateX: 0, rotateY: 0, rotateZ: 0 }}
      whileHover={{ rotateX: 0, rotateY: 0, rotateZ: -3 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative h-full transform-gpu transition-transform duration-300 ease-in-out">
        <div
          className="absolute inset-0 rounded-lg shadow-md"
          style={gradientStyle}
        ></div>
        <div
          className={`relative ${cardBackgroundColor} bg-opacity-90 dark:bg-opacity-90 p-5 rounded-lg shadow-sm overflow-hidden h-full flex flex-col transform-gpu transition-transform duration-300 ease-in-out group-hover:rotate-6`}
        >
          <h3 className={`text-lg font-semibold mb-2 truncate ${textColor}`}>
            {title}
          </h3>
          <p className={`text-sm mb-4 truncate ${subTextColor}`}>{url}</p>
          <div className="mt-auto">
            <motion.a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium"
              style={buttonStyle}
              whileHover={buttonHoverStyle}
            >
              Visit <ExternalLink className="ml-2 flex-shrink-0" size={14} />
            </motion.a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
