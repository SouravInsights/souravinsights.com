import React from "react";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import Color from "color";

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
  const gradientStyle = {
    background: `linear-gradient(to bottom right, ${gradientStart}, ${gradientEnd})`,
  };

  const isLight = isLightColor(gradientStart);
  const textColor = isLight ? "text-gray-800" : "text-white";
  const subTextColor = isLight ? "text-gray-600" : "text-gray-200";

  const buttonBackgroundColor = isLight
    ? Color(gradientEnd).lighten(0.1).hex()
    : Color(gradientEnd).darken(0.1).hex();
  const buttonTextColor = getContrastColor(buttonBackgroundColor);

  const buttonStyle = {
    backgroundColor: buttonBackgroundColor,
    color: buttonTextColor,
    transition: "all 0.3s ease",
  };

  const buttonHoverStyle = {
    backgroundColor: isLight
      ? Color(buttonBackgroundColor).darken(0.1).hex()
      : Color(buttonBackgroundColor).lighten(0.1).hex(),
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05, rotate: 0 }}
      className="group h-full"
      style={{ transformOrigin: "center" }}
    >
      <div
        className={`p-5 rounded-lg shadow-md overflow-hidden transition-all duration-300 transform -rotate-1 group-hover:rotate-0 h-full flex flex-col ${textColor}`}
        style={gradientStyle}
      >
        <h3 className="text-lg font-semibold mb-2 truncate">{title}</h3>
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
    </motion.div>
  );
}
