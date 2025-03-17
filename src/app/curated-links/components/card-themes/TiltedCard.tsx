import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import Color from "color";
import { useTheme } from "@/context/ThemeContext";
import posthog from "posthog-js";

interface CardProps {
  title: string;
  url: string;
  description?: string;
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
  description,
  gradientStart,
  gradientEnd,
}: CardProps) {
  const handleLinkClick = () => {
    posthog.capture("link_clicked_tilted_card", { url });
  };

  const { isDarkMode } = useTheme();

  // Adjust gradient colors for dark mode to ensure better visibility
  const adjustedGradientStart = isDarkMode
    ? Color(gradientStart).lighten(0.1).hex()
    : gradientStart;
  const adjustedGradientEnd = isDarkMode
    ? Color(gradientEnd).lighten(0.1).hex()
    : gradientEnd;

  const gradientStyle = {
    background: `linear-gradient(to bottom right, ${adjustedGradientStart}, ${adjustedGradientEnd})`,
    opacity: isDarkMode ? 0.8 : 1, // Slightly reduce opacity in dark mode for better contrast
  };

  // Determine if the gradient background is light (for both modes)
  const isGradientLight = isLightColor(adjustedGradientStart);

  // More dynamic text color handling for both modes
  const textColor = isDarkMode
    ? isGradientLight
      ? "text-gray-800"
      : "text-gray-100"
    : isGradientLight
    ? "text-gray-800"
    : "text-white";

  const subTextColor = isDarkMode
    ? isGradientLight
      ? "text-gray-600"
      : "text-gray-300"
    : isGradientLight
    ? "text-gray-600"
    : "text-gray-200";

  // In dark mode, lighten button colors instead of darkening them
  const buttonBackgroundColor = isDarkMode
    ? isGradientLight
      ? Color(adjustedGradientEnd).darken(0.1).hex()
      : Color(adjustedGradientEnd).lighten(0.2).hex()
    : isGradientLight
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
      : isGradientLight
      ? Color(buttonBackgroundColor).darken(0.1).hex()
      : Color(buttonBackgroundColor).lighten(0.1).hex(),
  };

  // Adjust card background opacity based on mode
  const cardBackgroundColor = isDarkMode ? "bg-gray-900" : "bg-white";
  const bgOpacity = isDarkMode ? "bg-opacity-95" : "bg-opacity-90";

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
          className={`relative ${cardBackgroundColor} ${bgOpacity} p-5 rounded-lg shadow-sm overflow-hidden h-full flex flex-col transform-gpu transition-transform duration-300 ease-in-out group-hover:rotate-6`}
        >
          <h3
            className={`text-lg font-semibold mb-2 line-clamp-2 ${textColor}`}
            style={{
              overflow: "hidden",
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </h3>
          <p className={`text-sm mb-4 line-clamp-3 ${subTextColor}`}>
            {description}
          </p>
          <div className="mt-auto">
            <motion.a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium"
              style={buttonStyle}
              whileHover={buttonHoverStyle}
              onClick={handleLinkClick}
            >
              Visit <ExternalLink className="ml-2 flex-shrink-0" size={14} />
            </motion.a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
