import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import Color from "color";
import { useTheme } from "@/context/ThemeContext";
import posthog from "posthog-js";

interface CardProps {
  title: string;
  description: string;
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

export function LayeredCard({
  title,
  description,
  url,
  gradientStart,
  gradientEnd,
}: CardProps) {
  const handleLinkClick = () => {
    posthog.capture("link_clicked_layered_card", { url });
  };

  const { isDarkMode } = useTheme();

  const gradientStyle = {
    background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
    opacity: isDarkMode ? 0.8 : 1,
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

  return (
    <motion.div
      className="relative h-full w-full"
      initial={{ y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      {/* Bottom layer */}
      <div
        className="absolute inset-0 rounded-lg shadow-md transform translate-x-4 translate-y-4"
        style={{
          ...gradientStyle,
          opacity: isDarkMode ? 0.3 : 0.5,
        }}
      ></div>

      {/* Middle layer */}
      <div
        className="absolute inset-0 rounded-lg shadow-md transform translate-x-2 translate-y-2"
        style={{
          ...gradientStyle,
          opacity: isDarkMode ? 0.5 : 0.7,
        }}
      ></div>

      {/* Top layer (content) */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
        <div className="h-2" style={gradientStyle}></div>
        <div className="p-5 flex-grow flex flex-col">
          <h3 className={`text-lg font-semibold mb-2 truncate ${textColor}`}>
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
